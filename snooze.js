var snooze = {
    snoozes: [],
    pipes: {},
    guards: {},
    withID: function(id) {
        return this.snoozes.find(function(snooze) {
            return snooze.id === id;
        });
    },
    gen: function() {
        var re = /<~([^%>]+)?~>/g;
        var reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g;
        var code = 'var r=[];\n', cursor = 0, match;

        function add(line, js) {
            if (js) code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n'
            else if (line != '') code += 'r.push("' + line.replace(/"/g, '\\"') + '");\n'
            return add;
        }

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
        xhr = new XMLHttpRequest();
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
            }.bind(this)
        } else if (typeof(this.pipes[pipeName]) === "object") {
            return function(callback) {
                callback(this)
            }.bind(this.pipes[pipeName]);
        } else return this.pipes[pipeName];
    },
    init: function() {
        scripts = document.getElementsByTagName("script");
        this.snooze.snoozes = Array.prototype.filter.call(scripts, function(tag) {
            return tag.type === "text/snooze"
        });

        this.snooze.snoozes.forEach(function(snooze) {
            snooze.gen = this.gen.bind(snooze);
            snooze.refresh = this.refresh.bind(snooze);
            snooze.setPipe = function(pipeName) {
                snooze.pipe = this.genPipe(pipeName);
            }.bind(this);

            snooze.setPipe(snooze.getAttribute("data-pipe"));

            snooze.dom = document.createElement('div');
            snooze.parentNode.insertBefore(snooze.dom, snooze.nextSibling);

            if (snooze.getAttribute("data-guard") == null)
                snooze.guard = function(data) {return data};
            else snooze.guard = this.guards[snooze.getAttribute("data-guard")];

            snooze.period = snooze.getAttribute("data-period");
            if (snooze.period == null) snooze.period = 30;
            else if (snooze.period !== "none") {
                setInterval(snooze.refresh, snooze.period*1000);
            } snooze.refresh();
        }.bind(this.snooze));
    }
};

window.onload = snooze.init;
