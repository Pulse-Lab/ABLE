
var Exercise = function (uid, category="", name="", instructions=""){
  this.uid = uid;
  this.category = category;
  this.name = name;
  this.instructions = instructions;
  this.thing = "hmmm"
}

Exercise.prototype.getHtml = function () {
  var html = "<div class='exercise' id='"+this.name+"'>";
  html += "<div class='exercise_title'>"+this.name+"</div>"
  html += "<div class='exercise_instruction'></div>"
  html += "<div class='exercise_progress'></div>"
  html += "</div>"
  return html
}

// onchange functions of the inputs will mutate the exercisesObj
Exercise.prototype.getSetterHTML = function (exercisesObj){
  var div = document.createElement('div');
  div.className = "exercise_setup";

  var closure = this;

  // deleteButton
  var deleteButton = document.createElement('input')
  var deleted = false;
  deleteButton.type = "button"
  deleteButton.className = "exercise_setup_delete";
  deleteButton.value = "delete"
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
    var nameAndCategory = document.createElement('div')
    nameAndCategory.appendChild(document.createTextNode('Exercise name: '))

    var name = document.createElement('input')
    name.className = "exercise_setup_name"
    name.value = this.name;
    name.type = "text"
    name.onchange = function(){
      exercisesObj[closure.uid].name=name.value;
      div.style.background = "var(--panel-color)"
    };

    nameAndCategory.appendChild(name);
    nameAndCategory.appendChild(document.createTextNode('Exercise category: '))

    var category = document.createElement('input')
    category.className = "exercise_setup_category"
    category.value = this.category
    category.type = "text"
    category.onchange = function(){
      exercisesObj[closure.uid].category = category.value
      div.style.background = "var(--panel-color)"
    };
    nameAndCategory.appendChild(category)

  div.appendChild(nameAndCategory)

  // tips/reminders
  div.appendChild(document.createTextNode('Tips/Reminders: '));

  var instructions = document.createElement('textarea')
  instructions.className = "exercise_setup_instructions";
  instructions.value = this.instructions?this.instructions:"";
  instructions.onchange = function(){
    exercisesObj[closure.uid].instructions = instructions.value
    div.style.background = "var(--panel-color)"
  };
  div.appendChild(instructions);

  return div
}

// NOTE will have to change this when Exercise gets properties that are objects since Object.assign only goes down one layer
// (fml)
Exercise.prototype.clone = function(){
  return new Exercise(this.uid, this.category, this.name, this.instructions)
}

export default Exercise;
