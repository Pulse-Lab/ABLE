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

  var title = Util.dom("div", {className:"exercise_title", innerHTML:this.name});
  var instructions = Util.dom("div", {className:"exercise_instruction", innerHTML:this.instructions})
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
      exercisesObj[closure.uid].name=name.value;
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
      exercisesObj[closure.uid].category = category.value
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
  timeWidget.appendChild(this.time.type=="timer"?Util.timeInputWidget(this.time.minutes,this.time.seconds):Util.dom("div",{}))
  time.appendChild(timeWidget);
  var closure = this;
  timeDD.onchange = function(e){
    timeWidget.innerHTML = ""
    if(timeDD.value == "timer"){
      timeWidget.appendChild(Util.timeInputWidget(closure.time.minutes, closure.time.seconds))
    }
  }
  return time;
}

export default Exercise;
