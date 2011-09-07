var http = require('http'),
    should = require('should');

// Simplfied context
var context = {
  errors:[],  
  
  hasError:function() {
    return this.errors.length > 0
  },
  
  assertEquals:function(arg1, arg2) {
    if (arg1 !== arg2)
    {
      this.errors.push(['Equality test failed', arg1, '!==', arg2].join(' '))
      return false;
    }
    
    return false;
  },
  
  logInfo:function(msg) {
    console.log(this.isArray(msg) ? msg.join(' ') : msg);
  },
  
  logError:function(msg) {
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
var updateInquiries = {
  name:"My test",
  description:"test",
  resource:{
    host:"myhost",
    port:80,
    method:"POST",
    url:"myurl",
    headers:{"content-type":"application/json"}
  },
  requests:[{data:'data'},{data:'data'}],
  tests:{
    testOne:function(responses, context) {
      return context.assertEquals(responses[0].statusCode, 400, this);
    }
  }
}

var modules = [];
modules.push(updateInquiries);

// Node test main driver
(function(modules, context) {
    /** Responses generated from requests */
    responses = [];
    
    /**
     * Run over all modules provided executing in step:
     * 1. Make requests for each request defined in the module storing the results
     * 2. Run tests over responses
     * 3. Wrap up with final steps and clean up.
     */
    run = function(modules, context) {
      for (var i = 0; i < modules.length; ++i) {
        var module = modules[i];
        context.logInfo(["Running test module", module.name]);
        this.requests(module.resource, module.requests, context);
        this.test(module.tests, context);
        this.finish(context);
      }
    };
    
    /**
     * Runs through all requests defined in the module, listening for and caching the response
     */
    requests = function(resource, requests, context) {
      var clientResponses = [];
      
      for (var i = 0; i < requests.length; ++i) {        
        var request = context.coalesce([requests[i], resource]);
        var headers = request('headers');
        
        if (!headers['host']) {
          headers['host'] = request('host');
        }
        
        var client = http.createClient(request('port'), request('host'));
        var clientRequest = client.request(request('method'), request('url'), headers);
        
        clientRequest.end(JSON.stringify(request('data')));        
        
        clientRequest.on('response', function (clientResponse) {
          clientResponses.push(clientResponse);
          clientResponse.setEncoding('utf8');
          var statusCode = clientResponse.statusCode;
          var headers = JSON.stringify(clientResponse.headers);
          var data = ""
          
          clientResponse.on('data', function (chunk) {
            data += chunk
          });          
          
          clientResponse.on('end', function() {
            console.log('test')
            clientResponses.push('test')
          });
        });
      }
      console.log(clientResponses);
    };
    
    /**
     * Runs through the gamut of defined tests for the module
     */
    test = function(tests, responses, context) { };
    
    /**
     * Finalize and cleanup
     */
     finish = function(context) { };
    
    run(modules, context);
}(modules, context));