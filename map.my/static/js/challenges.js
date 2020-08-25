var challenges;
var templates = {};

states = {
  "johor": 0,
  "kedah": 0,
  "kelantan": 0,
  "melaka": 0,
  "negeri sembilan": 0,
  "pahang": 0,
  "pulau pinang": 0,
  "perak": 0,
  "perlis": 0,
  "selangor": 0,
  "terengganu": 0,
  "sabah": 0,
  "sarawak": 0
};

color_map = {
  "web": "#cc8fab",
  "reverse": "#cd4545",
  "crypto": "#efe4ad",
  "misc": "#795548",
  "pwn": "#009688",
  "network": "#446476",
  "forensic": "#03a9f4",
}

window.challenge = new Object();

function loadchal(id) {
  var obj = $.grep(challenges, function(e) {
    return e.id == id;
  })[0];

  if (obj.type === "hidden") {
    ezal({
      title: "Challenge Hidden!",
      body: "You haven't unlocked this challenge yet!",
      button: "Got it!"
    });
    return;
  }

  updateChalWindow(obj);
}

function loadchalbyname(chalname) {
  var obj = $.grep(challenges, function(e) {
    return e.name == chalname;
  })[0];

  updateChalWindow(obj);
}

function updateChalWindow(obj) {
  $.get(script_root + "/api/v1/challenges/" + obj.id, function(response) {
    var challenge_data = response.data;

    $.getScript(script_root + obj.script, function() {
      $.get(script_root + obj.template, function(template_data) {
        $("#challenge-window").empty();
        var template = nunjucks.compile(template_data);
        console.log(obj.template)
        window.challenge.data = challenge_data;
        window.challenge.preRender();

        challenge_data["description"] = window.challenge.render(
          challenge_data["description"]
        );
        challenge_data["script_root"] = script_root;

        $("#challenge-window").append(template.render(challenge_data));

        $(".challenge-solves").click(function(e) {
          getsolves($("#challenge-id").val());
        });
        $(".nav-tabs a").click(function(e) {
          e.preventDefault();
          $(this).tab("show");
        });

        // Handle modal toggling
        $("#challenge-window").on("hide.bs.modal", function(event) {
          $("#submission-input").removeClass("wrong");
          $("#submission-input").removeClass("correct");
          $("#incorrect-key").slideUp();
          $("#correct-key").slideUp();
          $("#already-solved").slideUp();
          $("#too-fast").slideUp();
        });

        $("#submit-key").click(function(e) {
          e.preventDefault();
          $("#submit-key").addClass("disabled-button");
          $("#submit-key").prop("disabled", true);
          window.challenge.submit(function(data) {
            renderSubmissionResponse(data);
            loadchals(function() {
              marksolves();
            });
          });
        });

        $("#submission-input").keyup(function(event) {
          if (event.keyCode == 13) {
            $("#submit-key").click();
          }
        });

        $(".input-field").bind({
          focus: function() {
            $(this)
              .parent()
              .addClass("input--filled");
            $label = $(this).siblings(".input-label");
          },
          blur: function() {
            if ($(this).val() === "") {
              $(this)
                .parent()
                .removeClass("input--filled");
              $label = $(this).siblings(".input-label");
              $label.removeClass("input--hide");
            }
          }
        });

        window.challenge.postRender();

        window.location.replace(
          window.location.href.split("#")[0] + "#" + obj.name
        );
        $("#challenge-window").modal();
      });
    });
  });
}

$("#submission-input").keyup(function(event) {
  if (event.keyCode == 13) {
    $("#submit-key").click();
  }
});

function renderSubmissionResponse(response, cb) {
  var result = response.data;

  var result_message = $("#result-message");
  var result_notification = $("#result-notification");
  var answer_input = $("#submission-input");
  result_notification.removeClass();
  result_message.text(result.message);

  if (result.status === "authentication_required") {
    window.location =
      script_root +
      "/login?next=" +
      script_root +
      window.location.pathname +
      window.location.hash;
    return;
  } else if (result.status === "incorrect") {
    // Incorrect key
    result_notification.addClass(
      "alert alert-danger alert-dismissable text-center"
    );
    result_notification.slideDown();

    answer_input.removeClass("correct");
    answer_input.addClass("wrong");
    setTimeout(function() {
      answer_input.removeClass("wrong");
    }, 3000);
  } else if (result.status === "correct") {
    // Challenge Solved
    result_notification.addClass(
      "alert alert-success alert-dismissable text-center"
    );
    result_notification.slideDown();

    $(".challenge-solves").text(
      parseInt(
        $(".challenge-solves")
          .text()
          .split(" ")[0]
      ) +
        1 +
        " Solves"
    );

    answer_input.val("");
    answer_input.removeClass("wrong");
    answer_input.addClass("correct");
  } else if (result.status === "already_solved") {
    // Challenge already solved
    result_notification.addClass(
      "alert alert-info alert-dismissable text-center"
    );
    result_notification.slideDown();

    answer_input.addClass("correct");
  } else if (result.status === "paused") {
    // CTF is paused
    result_notification.addClass(
      "alert alert-warning alert-dismissable text-center"
    );
    result_notification.slideDown();
  } else if (result.status === "ratelimited") {
    // Keys per minute too high
    result_notification.addClass(
      "alert alert-warning alert-dismissable text-center"
    );
    result_notification.slideDown();

    answer_input.addClass("too-fast");
    setTimeout(function() {
      answer_input.removeClass("too-fast");
    }, 3000);
  }
  setTimeout(function() {
    $(".alert").slideUp();
    $("#submit-key").removeClass("disabled-button");
    $("#submit-key").prop("disabled", false);
  }, 3000);

  if (cb) {
    cb(result);
  }
}

function marksolves(cb) {
  $.get(script_root + "/api/v1/" + user_mode + "/me/solves", function(
    response
  ) {
    var solves = response.data;
    var updatedOptions = { 'areas': {} };

    for (var i = solves.length - 1; i >= 0; i--) {
      var id = solves[i].challenge_id;
      var state = Object.keys(states).find(key => states[key] === id);
      updatedOptions.areas[state] = {
        attrs: {
          fill: "#232323"
        }
      }
    }

    $("#challenges-board").trigger('update', [{
      mapOptions: updatedOptions,
      animDuration: 500
    }]);

    if (cb) {
      cb();
    }
  });
}

function getsolves(id) {
  $.get(script_root + "/api/v1/challenges/" + id + "/solves", function(
    response
  ) {
    var data = response.data;
    $(".challenge-solves").text(parseInt(data.length) + " Solves");
    var box = $("#challenge-solves-names");
    box.empty();
    for (var i = 0; i < data.length; i++) {
      var id = data[i].account_id;
      var name = data[i].name;
      var date = moment(data[i].date)
        .local()
        .fromNow();
      var account_url = data[i].account_url;
      box.append(
        '<tr><td><a href="{0}">{2}</td><td>{3}</td></tr>'.format(
          account_url,
          id,
          htmlentities(name),
          date
        )
      );
    }
  });
}

function loadchals(cb) {
  $.get(script_root + "/api/v1/challenges", function (response) {
    challenges = response.data;

    var categories = [];
    var category_colors = [];
    var states_used = [];
    var chals_used = [];
    var chal_areas = {};
    var state_keys = Object.keys(states);

    for (var i = 0; i <= challenges.length - 1; i++) {
      var chal = challenges[i];

      if ($.inArray(chal.category, categories) == -1) {
        categories.push(chal.category);
      }

      chal.tags.forEach(function (tag) {
        if ($.inArray(tag, states_used) == -1) {
          // state asked for is available
          chal_areas[tag.value] = {
            tooltip: { content: "<span style=\"font-weight:bold;\">{0}</span><br><span>score: {1}</span>".format(chal.name, parseInt(chal.value)) },
            attrs: {
              cursor: "pointer",
              fill: color_map[chal.category]
            },
            attrsHover: {
              fill: "#ffa22d"
            }
          };
          states_used.push(tag.value);
          states[tag.value] = chal.id;
          chals_used.push(chal.id);
        } else {
          // get current challenge resides in asked state
          var curr_chal = $.grep(challenges, function (e) {
            return e.id == states[tag.value];
          })[0];

          // find new state for the old challenge
          for (var j = 0; j < state_keys.length; j++) {
            var state_asked = state_keys[j];
            if ($.inArray(state_asked, states_used) == -1) {
              chal_areas[state_asked] = {
                tooltip: { content: "<span style=\"font-weight:bold;\">{0}</span><br><span>score: {1}</span>".format(curr_chal.name, parseInt(curr_chal.value)) },
                attrs: {
                  cursor: "pointer",
                  fill: color_map[curr_chal.category]
                },
                attrsHover: {
                  fill: "#ffa22d"
                }
              };
              states_used.push(state_asked);
              states[state_asked] = curr_chal.id;
              break;
            }
          }

          // insert the challenge into the previous area
          chal_areas[tag.value] = {
            tooltip: { content: "<span style=\"font-weight:bold;\">{0}</span><br><span>score: {1}</span>".format(chal.name, parseInt(chal.value)) },
            attrs: {
              cursor: "pointer",
              fill: color_map[chal.category]
            },
            attrsHover: {
              fill: "#ffa22d"
            }
          };
          states[tag.value] = chal.id;
          chals_used.push(chal.id);
        }
      });

      if ($.inArray(chal.id, chals_used) == -1) {
        // no state asked in tags, need to find a state
        for (var j = 0; j < state_keys.length; j++) {
          var state_asked = state_keys[j];
          if ($.inArray(state_asked, states_used) == -1) {
            chal_areas[state_asked] = {
              tooltip: { content: "<span style=\"font-weight:bold;\">{0}</span><br><span>score: {1}</span>".format(chal.name, parseInt(chal.value)) },
              attrs: {
                cursor: "pointer",
                fill: color_map[chal.category]
              },
              attrsHover: {
                fill: "#ffa22d"
              }
            };
            states_used.push(state_asked);
            states[state_asked] = chal.id;
            chals_used.push(chal.id);
            break;
          }
        }
      }
    }

    for (var i = 0; i <= categories.length - 1; i++) {
      category_colors.push({
        attrs: {
          fill: color_map[categories[i]]
        },
        label: categories[i],
        sliceValue: categories[i]
      });
    }

    $("#challenges-board").mapael({
      map: {
        name: "malaysia",
        // zoom: {
        //   enabled: true,
        //   maxLevel: 20
        // },
        defaultArea: {
          attrs: {
            fill: "#ccc",
            stroke: "#fff",
            "stroke-width": 0.5
          },
          text: {
            attrs: { "font-size": 10, "font-family": "Arial, Helvetica, sans-serif" },
            attrsHover: { "font-size": 14, "font-family": "Arial, Helvetica, sans-serif" }
          },
          attrsHover: {
            fill: "#ccc",
            animDuration: 200
          },
          eventHandlers: {
            click: function (e, id, mapElem, textElem) {
              if ($.inArray(id, states_used) == -1)
                return;
              var chalid = states[id];
              loadchal(chalid);
              getsolves(chalid);
            }
          }
        }
      },
      legend: {
        area: {
          mode: 'horizontal',
          // title: "Categories",
          slices: category_colors
        }
      },
      areas: chal_areas,
    });

    marksolves();

    if (cb) {
      cb();
    }
  });
}

$("#submit-key").click(function(e) {
  submitkey(
    $("#challenge-id").val(),
    $("#submission-input").val(),
    $("#nonce").val()
  );
});

$(".challenge-solves").click(function(e) {
  getsolves($("#challenge-id").val());
});

$("#challenge-window").on("hide.bs.modal", function(event) {
  $("#submission-input").removeClass("wrong");
  $("#submission-input").removeClass("correct");
  $("#incorrect-key").slideUp();
  $("#correct-key").slideUp();
  $("#already-solved").slideUp();
  $("#too-fast").slideUp();
});

var load_location_hash = function() {
  if (window.location.hash.length > 0) {
    loadchalbyname(decodeURIComponent(window.location.hash.substring(1)));
  }
};

function update(cb) {
  loadchals(function() {
    //  Load the full list of challenges
    if (cb) {
      cb();
    }
  });
}

$(function() {
  update(function() {
    load_location_hash();
  });
});

$(".nav-tabs a").click(function(e) {
  e.preventDefault();
  $(this).tab("show");
});

$("#challenge-window").on("hidden.bs.modal", function() {
  $(".nav-tabs a:first").tab("show");
  history.replaceState("", document.title, window.location.pathname);
});

setInterval(update, 300000);
