;(function(exports){
	var doc = document;
	var isLtIE8 = ('' + doc.querySelector).indexOf('[native code]') === -1,
		isLteIE8 = !+[1,];
        isIE = isLtIE8 || navigator.userAgent.search(/(msie|trident)/i) !== -1;
	var idSuffix = (+new Date()),
		iframeId = 'iframe' + idSuffix,
		frmId = 'frm' + idSuffix,
		txtId = 'txt' + idSuffix,
		linkId = 'link' + idSuffix;	
	var currPath = (function(){
		var a = {},
			rExtractUri = /(?:http|https|file):\/\/.*?\/.+?.js/;
			// FF,Chrome
			if (doc.currentScript){
				return doc.currentScript.src;
			}

			var stack;
			try{
				a.b();
			}
			catch(e){
				stack = e.stack || e.stacktrace || e.fileName || e.sourceURL;
			}
			// IE10
			if (stack){
				var absPath = rExtractUri.exec(stack)[0];
				if (absPath){
					return absPath;
				}
			}

			// IE5-9
			for(var scripts = doc.scripts,
				i = scripts.length - 1,
				script; script = scripts[i--];){
				if (script.readyState === 'interactive'){
					// if less than ie 8, must get abs path by getAttribute(src, 4)
					return isLtIE8 ? script.getAttribute('src', 4) : script.src;
				}
			}
		}());
	currPath = currPath.substring(0, currPath.lastIndexOf('/') + 1);
	var encodeHtml = currPath + 'urlEncoder.html';

	var _utils = {
		fmt: function (tpl/*, arg1, arg2...*/) {
            if (arguments.length <= 1) {
            	return tpl;
            }

            var args = [].slice.call(arguments, 1);
            return tpl.replace(/\{([^}{]+)\}/g, function (match) {
                if (!match){
					return '';
                } 

                var key = match.replace(/[}{]/g, ''), index = Number(key);
                return args[index] || args[0][key] || '';
            });
        },
        extractQueryStr: function(url, key){
        	var r = new RegExp('[?&]'+ key + '(?:=([^&]+))?'); 
        	var group = r.exec(url);
        	return group[1] || '';
        }
	};


	var domBuilder = (function(){
		var _domFactory = document.createElement('DIV');
		var _createDom = function(domTpl){
			_domFactory.innerHTML = domTpl;
			return _domFactory.children;
		};

		var builder = {
			buildIFrame: function(){
				var domTpl = _utils.fmt('<iframe id="{0}" name="{0}" src="about:blank" width="0" height="0" ' +
                	'scrolling="no" allowtransparency="true" frameborder="0" style="display:none;"></iframe>',
                	iframeId);
				return _createDom(domTpl)[0];
			},
			buildFrm: function(){
  				var domTpl = _utils.fmt('<form id="{0}" target="{1}" method="get" action="{2}" style="width:0px;height:0px;overflow:hidden;dispaly:none;">' + 
	                '<input type="text" name="{3}" id="{3}" />' + 
	                '</form>',
	                frmId,
	                iframeId,
	                encodeHtml,
	                txtId);
  				return _createDom(domTpl)[0];
			},
			buildLink: function(){
				var domTpl = _utils.fmt('<link id="{0}" rel="stylesheet" type="text/css"/>', linkId);
				return _createDom(domTpl)[0];
			}
		};		

		return builder;	
	}());

	var encoderDirector = (function(){
		var encoder, iframeDom, frmDom, linkDom;

		var director = {
			build: function(){
				if (!encoder){
					var doms = [iframeDom = domBuilder.buildIFrame(), 
						frmDom = domBuilder.buildFrm(), 
						linkDom = domBuilder.buildLink()];
					var fragment = document.createDocumentFragment();
					for (var i = 0, dom; dom = doms[i++];){
						fragment.appendChild(dom);
					}
					document.body.appendChild(fragment);
					encoder = {
						encode: function(str, encoding, callback){
							// init
							frmDom.acceptCharset = encoding;
							frmDom.children[0].value = str;
							var origCharset;
							if (isIE){
								origCharset = document.charset;
								document.charset = encoding;
							}
							iframeDom.onload = function(){
								var iframeUrl = this.contentWindow.location.href;
								var encodeStr = _utils.extractQueryStr(iframeUrl, txtId);
								console.log(encodeStr);
								callback && callback(encodeStr);
							};

							// encode by submit form	
							frmDom.submit();	
							if (origCharset){
								document.charset = origCharset;
							}
						},	
						decode: function(str, encoding, callback){
							if (isLteIE8){

							}
							else{
								var dataURIScheme = _utils.fmt('data:text/css;charset,');
								linkDom.onload = function(){
									console.log(this.href);
								};
								linkDom.setAttrubite('href', dataURIScheme);
							}
						}
					};
				}

				return encoder;
			},
			destroy: function(){}
		};
		
		return director;
	}());

	var hooks = {};
	hooks['utf-8@encode'] = function(str){
		return arguments[2] && arguments[2].call(this, encodeURIComponent(str));
	};
	hooks['utf-8@decode'] = function(str){
		return arguments[2] && arguments[2].call(this, decodeURIComponent(str));
	};
	hooks['other@encode'] = function(str, encoding){
		var encoder = encoderDirector.build();
		encoder.encode(str, encoding);
	};
	hooks['other@decode'] = function(str){};

	exports.encode = function(str, encoding, callback){
		var hook = hooks[encoding.toLocaleLowerCase() + '@encode'] || hooks['other@encode'];
		return hook(str, encoding, callback);
	};
	exports.decode = function(str, encoding){
		var hook = hooks[encoding.toLocaleLowerCase() + '@decode'] || hooks['other@decode'];
		return hook(str, encoding);
	};
}(window.urlEncoder = {}));