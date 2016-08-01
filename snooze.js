var snooze = {
    snoozes: null,
    pipes: {},
    guards: {},
    gen: function() {
        var re = /<~([^%>]+)?~>/g, reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, code = 'var r=[];\n', cursor = 0, match;
        var add = function(line, js) {
            js? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
                (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
            return add;
        }
        while(match = re.exec(this.innerHTML)) {
            add(this.innerHTML.slice(cursor, match.index))(match[1], true);
            cursor = match.index + match[0].length;
        }
        add(this.innerHTML.substr(cursor, this.innerHTML.length - cursor));
        code += 'return r.join("");';

        this.dom.innerHTML = new Function(code.replace(/[\r\t\n]/g, '')).apply(this);
    },
    httpPipe: function(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', this);
        xhr.send(null);

        xhr.onreadystatechange = function() {
            var DONE = 4;
            var OK = 200;
            if (xhr.readyState === DONE) {
                if (xhr.status === OK) this(JSON.parse(xhr.responseText));
            } else if (xhr.status !== OK) console.log('Error: ' + xhr.status);
        }.bind(callback)
    },
    refresh: function() {
        this.pipe(function(data) {
            if (JSON.stringify(data) !== JSON.stringify(this.data)) {
                this.data = this.guard(data);
                this.gen();
            }
        }.bind(this));
    },
    init: function() {
        scripts = document.getElementsByTagName("script");
        this.snoozes = Array.prototype.filter.call(scripts, function(tag) {
            return tag.type === "text/snooze"
        });

        this.snoozes.forEach(function(snooze) {
            snooze.gen = this.gen.bind(snooze);
            snooze.refresh = this.refresh.bind(snooze);

            var pipeName = snooze.getAttribute("data-pipe");
            if (pipeName.indexOf("/") != -1) {
                snooze.pipe = this.httpPipe.bind(snooze.getAttribute("data-pipe"));
            }

            snooze.dom = document.createElement('div');
            snooze.parentNode.insertBefore(snooze.dom, snooze.nextSibling);

            if (snooze.getAttribute("data-guard") == null) snooze.guard = function(data) {return data};
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