var http = require('http'),
    should = require('should');

// Simplfied context
var context = {
  testsPending:0,
  testsExecuted:[],
  results:{
    executed:0,
    succeeded:0,
    failed:0
  },  
  
  startTest:function() {
    this.testsPending += 1;
  },
  
  finishTest:function(testSuite, currentTest, err) {
    var suite = this.testsExecuted[testSuite];
    
    if (!suite)
    {
      suite = {name:testSuite.name,tests:[]};
      this.testsExecuted[testSuite.name] = suite;      
    }
    
    suite.tests.push({test:currentTest.name,passed:!err ? "Success" : "Failed",error:err});
    this.results.executed += 1;
    
    if (err) { 
      this.results.failed += 1;
    } else {
      this.results.succeeded += 1;
    }
    
    this.testsPending -= 1;
  },
  
  logResults:function() {
    for (suite in this.testsExecuted) {
      this.logInfo(["Suite:",suite]);
      this.logInfo("Tests:")
      var tests = this.testsExecuted[suite].tests;
      for (var i = 0; i < tests.length; ++i) {
        var test = tests[i];
        this.logInfo(["\t",test.passed,'--',test.test])
        if (test.error) {
          var message = test.error.message;
          
          // should puts the whole object being tested into the AssertionError without setting the actual or expected values.
          // todo: remove this temporary hack
          if (message.indexOf("{") >= 0) {
            this.logInfo(["\t","\t","Expected object", message.slice(message.lastIndexOf('}') + 2)]);
          } else {
            this.logInfo(["\t","\t","Expected object", message]);
          }
          
        }
      }
    }

    this.logInfo(context.results);
  },
  
  logInfo:function(msg) {
    console.log(this.isArray(msg) ? msg.join(' ') : msg);
  },
  
  isArray:function(obj) {
    return typeof obj === 'object' && obj.constructor === Array
  },
  
  coalesce:function(objects) {
    return function(name) {
      for (var i = 0; i < objects.length; ++i) {
         if (objects[i][name]) {
           return objects[i][name];
         }
      }
    }
  }
}

// Modules to be tested, these will be loaded from the configured path to test definition files
var rentals = {
  name:"Rentals",
  description:"Test rentals resource",
  resource:{
    host:"www.tripadvisor.com",
    port:80,
    method:"POST",
    url:"/api/vacationrentals/rentals/60745?key=e05d1e33-e5ee-44c1-a161-440b42a93325",
    headers:{}
  },
  tests:[
    {
      name: "Test rentals in Boston",
      data:{},
      callback: function(response, data, context) {
        response.should.have.property('statusCode', 200);
        data.should.be.a('object');
        data.should.have.property('name','Boston')
      }
    }
  ]
}

var testSuites = [];
testSuites.push(rentals);

// Node test main driver
(function(testSuites, context) {
    /**
     * Run over all test suites provided executing in step:
     * 1. Run each defined test in the suite, calling the remote resource and preparing the result
     * 2. Execute callbacks defined for each test as the response is ready
     * 3. Wrap up with final steps and clean up.
     */
    run = function(testSuites, context) {
      for (var i = 0; i < testSuites.length; ++i) {
        var testSuite = testSuites[i];
        context.logInfo(["Running test suite --", testSuite.name]);
        this.test(testSuite, context);
      }
    };
    
    /**
     * Runs through all test defined in the suite, listening for and caching the response and 
     * executing the test.
     */
    test = function(testSuite, context) {      
      for (var i = 0; i < testSuite.tests.length; ++i) {
        context.startTest();
        var currentTest = testSuite.tests[i]
        var test = context.coalesce([currentTest, testSuite.resource]);
        context.logInfo(["Running test --", test('name')]);
        
        var headers = test('headers');
        if (!headers['host']) {
          headers['host'] = test('host');
        }
        
        var client = http.createClient(test('port'), test('host'));
        var clientRequest = client.request(test('method'), test('url'), headers);
        
        context.logInfo(["Issuing request to resource found at",test('host'),test('url')]);
        clientRequest.end(JSON.stringify(test('data')));
        
        clientRequest.on('response', function (clientResponse) {
          clientResponse.setEncoding('utf8');
          var statusCode = clientResponse.statusCode;
          var headers = JSON.stringify(clientResponse.headers);
          var data = ""
          
          clientResponse.on('data', function (chunk) {
            data += chunk
          });          
          
          clientResponse.on('end', function() {
            context.logInfo(["Executing callback for test --", currentTest.name]);
            try {
              test('callback')(clientResponse, JSON.parse(data), context);
              context.finishTest(testSuite, currentTest, null);
            } catch (error) {
              context.finishTest(testSuite, currentTest, error);
            }
            
            if (context.testsPending == 0)
            {
              context.logResults();
            }
          });
        });
      }
    };
    
    run(testSuites, context);
}(testSuites, context));