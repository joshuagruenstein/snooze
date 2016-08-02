var snooze = {
    snoozes: [],
    pipes: {},
    guards: {},
    handlers: {},
    handler_map: {
        "data-click":"click"
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
        this.pipe(function(data) {
            if (JSON.stringify(data) !== JSON.stringify(this.data)) {
                this.data = this.guard(data);
                this.gen();
            }
        }.bind(this));
    },
    genPipe: function(pipeName) {
        if (pipeName.indexOf("/") != -1) {
            return function(callback) {
                this.req("GET", pipeName, callback);
            }.bind(this);
        } else if (typeof(this.pipes[pipeName]) === "object") {
            return function(callback) {
                callback(this);
            }.bind(this.pipes[pipeName]);
        } else return this.pipes[pipeName];
    },
    init: function() {
        var elements = document.body.getElementsByTagName("*");
        this.snooze.snoozes = Array.prototype.filter.call(elements, function(tag) {
            return tag.type === "text/snooze";
        });

        Array.prototype.forEach.call(elements,function(element) {
            for (var i=0; i<element.attributes.length; i++) {
                if (this.handler_map[element.attributes[i].nodeName] != undefined) {
                    var functionName = element.attributes[i].nodeValue;
                    var eventName = this.handler_map[element.attributes[i].nodeName];
                    element.addEventListener(eventName,this.handlers[functionName]);
                }
            }
        }.bind(this.snooze));

        this.snooze.snoozes.forEach(function(snooze) {
            snooze.gen = this.gen.bind(snooze);
            snooze.refresh = this.refresh.bind(snooze);
            snooze.setPipe = function(pipeName) {
                snooze.pipe = this.genPipe(pipeName);
            }.bind(this);

            snooze.setPipe(snooze.getAttribute("data-pipe"));

            snooze.dom = document.createElement('div');
            snooze.parentNode.insertBefore(snooze.dom, snooze.nextSibling);

            if (snooze.getAttribute("data-guard") === null) {
                snooze.guard = function(data) { return data; };
            } else snooze.guard = this.guards[snooze.getAttribute("data-guard")];

            snooze.period = snooze.getAttribute("data-period");
            if (snooze.period === null) snooze.period = 30;
            else if (snooze.period !== "none") {
                setInterval(snooze.refresh, snooze.period*1000);
            } snooze.refresh();
        }.bind(this.snooze));
    }
};

window.onload = snooze.init;
