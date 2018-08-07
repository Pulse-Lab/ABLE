
var Exercise = function (category, name){
  this.category = category;
  this.name = name;
}

Exercise.prototype.getHtml = function () {
  var html = "<div class='exercise' id='"+this.name+"'>";
  html += "<div class='exercise_title'>"+this.name+"</div>"
  html += "<div class='exercise_instruction'></div>"
  html += "<div class='exercise_progress'></div>"
  html += "</div>"
  return html
}

export default Exercise;
