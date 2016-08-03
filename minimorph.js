var minimorph = {
    inputElHandler: function(fromEl, toEl) {
        if (toEl.hasAttribute('checked') && !fromEl.hasAttribute('checked'))
            fromEl.checked = 1;
        if (toEl.hasAttribute('value') && !fromEl.hasAttribute('value'))
            fromEl.value = toEl.getAttribute("value");
    },
    morphAttrs: function (fromNode, toNode) {
        var foundAttrs = {};

        for (var i=toNode.attributes.length-1; i>=0; i--) {
            var attr = toNode.attributes[i];
            if (attr.specified !== false) {
                foundAttrs[attr.name] = true;
                if (fromNode.getAttribute(attr.name) !== attr.value) {
                    fromNode.setAttribute(attr.name, attr.value);
                }
            }
        }

        for (var i=fromNode.attributes.length-1; i>=0; i--) {
            var attr = fromNode.attributes[i];
            if (attr.specified !== false) {
                var attrName = attr.name;
                if (!foundAttrs.hasOwnProperty(attrName)) {
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    },

    morph: function(fromNode, toNode) {
        var savedEls = {};
        var unmatchedEls = {};

        var newDOM = document.createElement("div");
        newDOM.innerHTML = toNode;
        toNode = newDOM;

        function removeNodeHelper(node, nestedInSavedEl) {
            if (node.id) savedEls[node.id] = node;
            if (node.nodeType === 1) {
                var curChild = node.firstChild;
                while(curChild) {
                    removeNodeHelper(curChild, nestedInSavedEl || id);
                    curChild = curChild.nextSibling;
                }
            }
        }

        function walkDiscardedChildNodes(node) {
            if (node.nodeType === 1) {
                var curChild = node.firstChild;
                while(curChild) {
                    if (!curChild.id) walkDiscardedChildNodes(curChild);
                    curChild = curChild.nextSibling;
                }
            }
        }

        function removeNode(node, parentNode, alreadyVisited) {
            parentNode.removeChild(node);
            if (alreadyVisited) {
                if (!node.id) walkDiscardedChildNodes(node);
            } else removeNodeHelper(node);
        }

        function morphEl(fromEl, toEl, alreadyVisited) {
            if (toEl.id) delete savedEls[toEl.id];

            var curToNodeChild = toEl.firstChild;
            var curFromNodeChild = fromEl.firstChild;
            var curToNodeId;

            var fromNextSibling;
            var toNextSibling;
            var savedEl;
            var unmatchedEl;

outer:      while(curToNodeChild) {
                toNextSibling = curToNodeChild.nextSibling;
                curToNodeId = curToNodeChild.id;

                while(curFromNodeChild) {
                    var curFromNodeId = curFromNodeChild.id;
                    fromNextSibling = curFromNodeChild.nextSibling;

                    if (!alreadyVisited) {
                        if (curFromNodeId && (unmatchedEl = unmatchedEls[curFromNodeId])) {
                            unmatchedEl.parentNode.replaceChild(curFromNodeChild, unmatchedEl);
                            morphEl(curFromNodeChild, unmatchedEl, alreadyVisited);
                            curFromNodeChild = fromNextSibling;
                            continue;
                        }
                    }

                    var curFromNodeType = curFromNodeChild.nodeType;

                    if (curFromNodeType === curToNodeChild.nodeType) {
                        var isCompatible = false;

                        if (curFromNodeType === 1) { // Both nodes being compared are Element nodes
                            if (curFromNodeChild.tagName === curToNodeChild.tagName) {
                                if (curFromNodeId || curToNodeId) {
                                    if (curToNodeId === curFromNodeId) isCompatible = true;
                                } else isCompatible = true;
                            } if (isCompatible) morphEl(curFromNodeChild, curToNodeChild, alreadyVisited);
                        } else if (curFromNodeType === 3) { // Both nodes being compared are Text nodes
                            isCompatible = true;
                            curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                        }

                        if (isCompatible) {
                            curToNodeChild = toNextSibling;
                            curFromNodeChild = fromNextSibling;
                            continue outer;
                        }
                    }

                    // No compatible match so remove the old node from the DOM and continue trying
                    // to find a match in the original DOM
                    removeNode(curFromNodeChild, fromEl, alreadyVisited);
                    curFromNodeChild = fromNextSibling;
                }

                if (curToNodeId) {
                    if ((savedEl = savedEls[curToNodeId])) {
                        morphEl(savedEl, curToNodeChild, true);
                        curToNodeChild = savedEl; // We want to append the saved element instead
                    } else unmatchedEls[curToNodeId] = curToNodeChild;
                } fromEl.appendChild(curToNodeChild); // end of search

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            while(curFromNodeChild) {
                fromNextSibling = curFromNodeChild.nextSibling;
                removeNode(curFromNodeChild, fromEl, alreadyVisited);
                curFromNodeChild = fromNextSibling;
            }

            if (fromEl.tagName === "INPUT") minimorph.inputElHandler(fromEl, toEl);
        }

        var morphedNode = fromNode;
        var morphedNodeType = morphedNode.nodeType;
        var toNodeType = toNode.nodeType;

        if (morphedNode !== toNode) morphEl(morphedNode, toNode, false);

        return morphedNode;
    }
};
