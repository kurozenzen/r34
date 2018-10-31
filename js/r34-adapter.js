// config
const serviceUrl = "https://custom-r34-api.herokuapp.com";
const autoCompleteUrl = "https://rule34.xxx/autocomplete.php";

// angular
var app = angular.module('r34App', ['infinite-scroll']);
app.controller('r34Ctrl', function ($http) {
    var controller = this;

    // init function
    controller.init = function () {

        // init variables
        controller.activeTags = [];
        controller.alias = [];
        controller.pageId = 0;
        controller.pageSize = 10;
        controller.noImagesLeft = false;
        controller.lastScroll = 0;
        // init awesomplete
        var input = document.getElementById("input_tag");
        input.addEventListener("input", function () {
            controller.getSuggestions();
        });
        controller.awesomplete = new Awesomplete(input, {
            minChars: 3,
            maxItems: 10,
            sort: false,
            filter: function (text, input) {
                return text.includes(tagify(input));
            }
        });
        $("div.awesomplete").addClass("flex-grow-1");


        // init switches
        $(".switch").bootstrapSwitch();
    };

    // get posts
    controller.getPosts = function (mode) {
        controller.lastScroll = Date.now();

        let tagArray = controller.activeTags.map(v => v);
        if ($('#likes').prop('checked')) 
            tagArray.push("sort:score");
        let tags = "";
        let page = "";
        if (tagArray.length > 0) {
            tags = "&tags=" + tagArray.join("+");
        }

        if (mode === "append") {
            controller.pageId++;
            page = "&pid=" + controller.pageId;
        } else {
            controller.pageId = 0;
            controller.noImagesLeft = false;
        }

        $http.get(serviceUrl + "/posts?limit=" + controller.pageSize + tags + page)
            .then(function (response) {
                let posts = response.data;

                if (posts.length === 0) {
                    controller.noImagesLeft = true;
                }

                let filtered = false;
                if ($('#approved').prop('checked')) {
                    filtered = true;
                    posts = posts.filter(post => post.score > 0);
                }

                if (mode === "append") {
                    controller.posts.push(...posts);
                } else {
                    controller.posts = posts;
                }

                if (filtered && controller.posts.length < controller.pageSize) {
                    controller.getPosts("append");
                }
            })
            .catch(function (error) {
                console.log(error);
            });
    };

    // collapse details
    controller.details = function (postId) {
        let selector = "#" + postId + " > .collapse";
        $(selector).collapse("toggle");
    };

    // add a tag to selection
    controller.addTag = function (tag) {
        if (tag === undefined) {
            tag = $("#input_tag").val();
            $("#input_tag").val("");
        }

        tag = tag.toLowerCase();

        if (tag && tag != "" && !controller.activeTags.includes(tag)) {
            controller.activeTags.push(tag);
            controller.getAlias();
        }
    };

    // remove a tag from selection
    controller.removeTag = function (tag) {
        controller.activeTags.splice(controller.activeTags.indexOf(tag), 1);
        controller.getAlias();
    };

    // toggle a tag
    controller.toggleTag = function (tag) {
        if (controller.activeTags.includes(tag)) {
            controller.removeTag(tag);
        } else {
            controller.addTag(tag);
        }
    };

    controller.tagClass = function (tag) {
        if (tag.startsWith("-"))
            return "exclude";
        if (tag.startsWith("source:"))
            return "source";
        if (tag.startsWith("rating:"))
            return "rating";
        return "";
    };

    controller.tagName = function (tag) {
        if (tag.includes(":"))
            return tag.split(":")[1];
        if (tag.startsWith("-"))
            return tag.substring(1);
        return tag;
    }

    // get tags for awesomplete
    controller.getSuggestions = function () {
        let search = tagify($("#input_tag").val()) + "*";

        if (search.length > controller.awesomplete.minChars) {
            $http.get(serviceUrl + "/tags?limit=" + controller.awesomplete.maxItems + "&name=" + search + "&order_by=posts")
                .then(function (response) {
                    controller.awesomplete.list = response.data.map(tag => {
                        return {
                            label: tag.name + " (" + tag.posts + ")",
                            value: tag.name
                        };
                    });
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
    };

    controller.getAlias = function () {
        controller.alias = [];
        for (let activeTag of controller.activeTags) {
            $http.get(serviceUrl + "/alias/" + activeTag)
                .then(function (response) {
                    controller.alias.push(...response.data.filter(t => !controller.activeTags.includes(t.name)));
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
    }

    controller.vote = function (postId, type) {
        $http.get("https://rule34.xxx/index.php?page=post&s=vote&id=" + postId + "&type=" + type)
            .then(function (response) {
                controller.posts.find(post => post.id === postId).score = parseInt(response.data);
            })
            .catch(function (error) {
                console.log(error);
            });
    };

    // load more posts
    controller.infiniteScroll = function () {
        let now = Date.now();
        if (now - controller.lastScroll > 1000) {
            controller.getPosts("append");
            controller.lastScroll = now;
        }
    };

    // check if infinite-scroll should be disabled
    controller.infiniteScrollDisabled = function () {
        return $("#infiniteScroll").prop('checked') !== true || controller.noImagesLeft;
    };
});

function tagify(text) { // only for suggestions
    return text.toLowerCase()
        .replace(/ /g, "_")
        .replace("-", "");
}