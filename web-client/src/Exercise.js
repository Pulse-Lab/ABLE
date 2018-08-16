import Util from "./Util.js"


// var Exercise = function (uid, category="", name="", instructions=""){
var Exercise = function (uid, options){
  this.uid = uid;
  for (var i in options){
    this[i] = options[i]
  }
  this.time = this.time?this.time:{type:"none"};
}

Exercise.prototype.getHtml = function () {
  var div = Util.dom("div", {className:"exercise", id:this.name});
  //Title
  var title = Util.dom("div", {className:"exercise_title", innerHTML:this.name});

  // Instructions (text, timer, reps, media element)
  //   reps          |        media element
  //   timer         |
  //   _______________________________________
  //             Instructions text
  var instructions = Util.dom("div", {className:"exercise_instruction"})

  var row1 = Util.dom("div",{className:"row1"});
  instructions.appendChild(row1)
  var repsAndTimer = Util.dom("div", {className:"repsAndTimer"});
  var reps = Util.dom("div",{className:"reps"});
  var timer = Util.dom("timer",{className:"timer"});
  repsAndTimer.appendChild(reps);
  repsAndTimer.appendChild(timer);

  var media = Util.dom("div",{className:"media"})

  row1.appendChild(repsAndTimer)
  row1.appendChild(media);

  // row1.style.height = this.media|(this.time.type!="none"&&  TODO....


  var text = Util.dom("div",{className:"text",innerHTML:this.instructions});
  instructions.appendChild(text);

  // Progress bar (TODO - ?)
  var progress = Util.dom("div",{className:"exercise_progress"});

  div.appendChild(title)
  div.appendChild(instructions)
  div.appendChild(progress)
  return div
}

// onchange functions of the inputs will mutate the exercisesObj
Exercise.prototype.getSetterHTML = function (exercisesObj){
  var div = Util.dom("div",{className:"exercise_setup"})

  var closure = this;

  // deleteButton
  var deleteButton = Util.dom("input", {type:"button", className:"exercise_setup_delete", value:"delete"})
  var deleted = false;
  deleteButton.onclick = function(){
    deleted = !deleted;
    if(deleted){
      delete exercisesObj[closure.uid]
      div.style.background = "rgb(230,100,100)";
      deleteButton.value = "undo"
    } else{
      exercisesObj[closure.uid] = closure
      div.style.background = "var(--light-panel-color)"
      deleteButton.value = "delete"
    }
  }
  div.appendChild(deleteButton)

  // name and category
    // var nameAndCategory = Util.dom("div",{})
    // nameAndCategory.appendChild(document.createTextNode('Exercise name: '))
    var name = Util.dom("div",{className:"exercise_setup_name"})
    var nameInput = Util.dom("input",{value:this.name,type:"text"})
    name.onchange = function(){
      exercisesObj[closure.uid].name=nameInput.value;
      div.style.background = "var(--panel-color)"
    };
    name.appendChild(document.createTextNode("Exercise name: "))
    name.appendChild(nameInput);
    div.appendChild(name);
    // nameAndCategory.appendChild(name);
    // nameAndCategory.appendChild(document.createTextNode('Exercise category: '))

    var category = Util.dom("div", {className:"exercise_setup_category"})
    var categoryInput = Util.dom("input",{value:this.category,type:"text"})
    category.onchange = function(){
      exercisesObj[closure.uid].category = categoryInput.value
      div.style.background = "var(--panel-color)"
    };
    category.appendChild(document.createTextNode("Exercise category:"));
    category.appendChild(categoryInput);
    // nameAndCategory.appendChild(category)

  div.appendChild(category)

  // tips/reminders
  div.appendChild(document.createTextNode('Tips/Reminders: '));

  var instructions = Util.dom("textarea", {className:"exercise_setup_instructions", value:this.instructions?this.instructions:""})
  instructions.onchange = function(){
    exercisesObj[closure.uid].instructions = instructions.value
    div.style.background = "var(--panel-color)"
  };
  div.appendChild(instructions);
  var setTimer = this.setTimerWidget();
  div.appendChild(setTimer);
  return div
}

// NOTE will have to change this when Exercise gets properties that are objects since Object.assign only goes down one layer
// (fml)
Exercise.prototype.clone = function(){
  return new Exercise(this.uid, this)
}

Exercise.prototype.setTimerWidget = function (){

  var closure = this;
  var time = Util.dom("div",{className:"exercise_setup_time"});
  // If there is a timer or not
  // var timerCheckBox = Util.dom("input",{innerHTML:"Exercise timer:",type:"checkbox",checked:this.time?true:false});
  // var timePicker = Util.dom("div",{className:"exercise_setup_time_picker", innerHTML:""});
  // timePicker.style.display = timerCheckBox.checked?"":none;
  time.appendChild(Util.dom("div",{innerHTML:"Timer: ",style:"display:inline-block"}));

  var timeDD = Util.dom("select",{style:"display:inline-block"});
  time.appendChild(timeDD);
  var timeDDNone = Util.dom("option",{value:"none",innerHTML:"None"})
  var timeDDStopwatch = Util.dom("option",{value:"stopwatch",innerHTML:"stopwatch"})
  var timeDDTimer = Util.dom("option",{value:"timer",innerHTML:"timer"})
  timeDD.appendChild(timeDDNone);
  timeDD.appendChild(timeDDStopwatch);
  timeDD.appendChild(timeDDTimer);
  timeDD.value = this.time?this.time.type:"none";

  var timeWidget = Util.dom("div",{style:"display:inline-block"})
  // timeWidget.appendChild(this.time.type=="timer"?Util.timeInputWidget(this.time.minutes,this.time.seconds):Util.dom("div",{}))

  timeWidget.appendChild(this.time.type=="timer"?this.timeInputWidget():Util.dom("div",{}))

  time.appendChild(timeWidget);
  var closure = this;
  timeDD.onchange = function(e){
    timeWidget.innerHTML = ""
    if(timeDD.value == "timer"){
      // var timeInputWidget = Util.timeInputWidget(closure.time.minutes, closure.time.seconds);
      // var mins = timeInputWidget.childNodes[0];
      // var secs = timeInputWidget.childNodes[1];
      closure.time.type = "timer"
      timeWidget.appendChild(closure.timeInputWidget());
    } else {
      closure.time.seconds = undefined;
      closure.time.minutes = undefined;
      closure.time.type = timeDD.value;
    }
  }
  return time;
}


Exercise.prototype.timeInputWidget = function (containerProperties={}){
  var closure = this;

  var initialMin = isNaN(this.time.minutes)?0:this.time.minutes;
  var initialSec = isNaN(this.time.seconds)?"00":Util.toZeros(this.time.seconds);

  containerProperties.className = containerProperties.className?containerProperties.className:"timeInputWidget";
  var container = Util.dom("div",containerProperties);
  var minutes = Util.dom("input",{type:"text",pattern:"[0-9]*",value:initialMin, className:"setTimer_minutes"});
  minutes.onchange = function(){
    minutes.value = Math.floor(Util.clip(minutes.value,0,Infinity));
    minutes.value = isNaN(minutes.value)?0:minutes.value;
    closure.time.minutes = Util.clip(parseInt(minutes.value), 0, Infinity);
  };

  var minutesTxt = Util.dom("div",{innerHTML:"minutes "});
  var seconds = Util.dom("input",{type:"text",pattern:"[0-9]*",placeholder:'00',value:Util.toZeros(initialSec),className:"setTimer_seconds"});
  seconds.onchange = function(){
    minutes.value = Math.floor(Util.clip(parseInt(minutes.value) + Math.floor(seconds.value/60),0,Infinity));
    seconds.value = Util.toZeros(Util.clip(seconds.value%60,0,Infinity));
    closure.time.minutes = parseInt(minutes.value);
    closure.time.seconds = parseInt(seconds.value);
  };

  var secondsTxt = Util.dom("div",{innerHTML:"seconds"})
  container.appendChild(minutes);
  container.appendChild(minutesTxt);
  container.appendChild(seconds);
  container.appendChild(secondsTxt);


  return container
}

export default Exercise;
