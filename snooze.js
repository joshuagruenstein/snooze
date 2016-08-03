var snooze = {
    snoozes: [],
    pipes: {},
    guards: {},
    handlers: {},
    models: {},
    handler_map: {
        "data-click":"click",
        "data-input":"input",
        "data-change":"change",
        "data-mouseover":"mouseover",
        "data-keydown":"keydown"
    },
    withID: function(id) {
        return this.snoozes.find(function(snooze) {
            return snooze.id === id;
        });
    },
    gen: function() {
        var re = new RegExp("<~([^%>]+)?~>","g");
        var reExp = new RegExp("(^( )?(if|for|else|switch|case|break|{|}))(.*)?","g");
        var code = "var r=[];\n";
        var cursor = 0;

        function add(line, js) {
            if (js) code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n';
            else if (line !== '') code += 'r.push("' + line.replace(/"/g, '\\"') + '");\n';
            return add;
        }

        var match;
        while(match = re.exec(this.innerHTML)) {
            add(this.innerHTML.slice(cursor, match.index))(match[1], true);
            cursor = match.index + match[0].length;
        }

        add(this.innerHTML.substr(cursor, this.innerHTML.length - cursor));
        code += 'return r.join("");';

        this.dom.innerHTML = new Function(
            code.replace(/[\r\t\n]/g, '')
        ).apply(this);
    },
    req: function(type, url, callback, data) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200)
                callback(JSON.parse(xhr.responseText));
        }; xhr.open(type, url, true);
        xhr.send(JSON.stringify(data));
    },
    refresh: function() {
        this.pipe.func(function(newData) {
            if (this.pipe.type !== "object" && JSON.stringify(newData) === JSON.stringify(this.data)) return;

            this.guards.forEach(function(func) {
                newData = func(newData);
            }); this.data = newData;

            this.gen();

            var elements = this.dom.getElementsByTagName("*");
            window.snooze.bindToState(elements);
            window.snooze.setListeners(elements);
        }.bind(this));
    },
    genPipe: function(pipeName) {
        if (pipeName.indexOf("/") != -1) {
            return {
                func: function(callback) {
                    this.req("GET", pipeName, callback);
                }.bind(this),
                type: "http",
                url: pipeName
            };
        } else if (typeof(this.pipes[pipeName]) === "object") {
            return {
                func: function(callback) {
                    callback(this.pipes[pipeName]);
                }.bind(this),
                type: "object"
            };
        } else return {
            func: this.pipes[pipeName],
            type: "custom"
        };
    },
    setListeners: function(elements) {
        Array.prototype.forEach.call(elements,function(element) {
            for (var i=0; i<element.attributes.length; i++) {
                if (this.handler_map[element.attributes[i].nodeName] != undefined) {
                    var eventName = this.handler_map[element.attributes[i].nodeName];
                    element.attributes[i].nodeValue.split(" ").forEach(function(name) {
                        element.addEventListener(eventName,this.handlers[name]);
                    }.bind(this));
                }
            }
        }.bind(this));
    },
    bindToState: function(elements) {
        function addProps(obj, arr, val) {
            if (typeof arr == 'string') arr = arr.split(".");
            obj[arr[0]] = obj[arr[0]] || {};
            var tmpObj = obj[arr[0]];
            if (arr.length > 1) {
                arr.shift();
                addProps(tmpObj, arr, val);
            } else obj[arr[0]] = val;
            return obj;
        }

        Array.prototype.forEach.call(elements,function(element) {
            for (var i=0; i<element.attributes.length; i++) {
                if (element.attributes[i].nodeName === "data-model") {
                    element.attributes[i].nodeValue.split(" ").forEach(function(modelName) {
                        if (element.className.split(" ").includes("radioGroup")) {
                            element.childNodes.forEach(function(node) {
                                node.name="snooze-temp";
                            });

                            var selected = element.querySelector('input:checked');
                            var value = selected === null ? null : selected.value;
                            addProps(this.models, modelName, value);
                            element.addEventListener("change",function(e) {
                                var selected = element.querySelector('input:checked');
                                var value = selected === null ? null : selected.value;
                                addProps(this.models, modelName, value);
                            }.bind(this));
                        } else if (element.type === "checkbox" || element.type === "radio") {
                            addProps(this.models, modelName, element.checked);
                            element.addEventListener("change",function(e) {
                                addProps(this.models, modelName, element.checked);
                            }.bind(this));
                        } else {
                            addProps(this.models, modelName, element.value);
                            element.addEventListener("input",function(e) {
                                addProps(this.models, modelName, element.value);
                            }.bind(this));
                        }
                    }.bind(this));

                }
            }
        }.bind(this));
    },
    init: function() {
        var elements = document.body.getElementsByTagName("*");
        this.snooze.bindToState(elements);
        this.snooze.setListeners(elements);

        this.snooze.snoozes = Array.prototype.filter.call(elements, function(tag) {
            return tag.type === "text/snooze";
        });

        this.snooze.snoozes.forEach(function(snooze) {
            snooze.gen = this.gen.bind(snooze);
            snooze.refresh = this.refresh.bind(snooze);
            snooze.setPipe = function(pipeName) {
                snooze.pipe = this.genPipe(pipeName);
                snooze.refresh();
            }.bind(this);

            snooze.dom = document.createElement('div');
            snooze.parentNode.insertBefore(snooze.dom, snooze.nextSibling);

            if (snooze.getAttribute("data-guard") === null) {
                snooze.guard = function(data) { return data; };
            } else {
                snooze.guards = [];
                snooze.getAttribute("data-guard").split(" ").forEach(function(guard) {
                    snooze.guards.push(this.guards[guard]);
                }.bind(this));
            }

            snooze.setPipe(snooze.getAttribute("data-pipe"));

            if (snooze.getAttribute("data-period") !== "none") {
                snooze.period = parseFloat(snooze.getAttribute("data-period"));
                if (isNaN(snooze.period)) {
                    if (snooze.pipe.type === "http") snooze.period = 20;
                    else if (snooze.pipe.type === "object") snooze.period = 0.2;
                    else snooze.period = 1;
                } setInterval(snooze.refresh, snooze.period*1000);
            } else snooze.period = "none";
        }.bind(this.snooze));
    }
};

window.onload = snooze.init;
