import Exercise from "./Exercise.js"

var content = document.getElementById("content")

var exercises={};
var request = new XMLHttpRequest();
request.open("GET", 'exercises.json', true);
request.responseType = "json"
request.onload = function() {
   if(request.readyState != 4) throw Error("readyState != 4");
   if(request.status != 200) throw Error("status != 200");
   if(request.response == null) throw Error("JSON response null");
   console.log(exercises)
   for (var i in request.response){
     exercises[i] = new Exercise(request.response[i].category, request.response[i].name);
   }
   loadFirstPage();
 }
request.send();

document.getElementById('settings').onclick = settingsMenu;

document.getElementById('close').onclick = (x)=>{document.getElementById('settings_menu').style.display='none'}


function loadFirstPage(){
  var categories = {};
  for (var i in exercises){
    var category = exercises[i].category
    if(categories[category]==undefined){
      categories[category] = [exercises[i]]
    } else {
      categories[category].push(exercises[i])
    }
  }
  content.innerHTML = ""
  console.log(categories)
  for(var i in categories){
    var div = document.createElement('div')
    div.className =  "exercise_category";
    var txtDiv = document.createElement('div')
    txtDiv.className = "exercise_category_text"
    var txt = document.createTextNode(i)
    txtDiv.appendChild(txt)
    div.appendChild(txtDiv)
    const uhg = i;
    div.onclick = function (ev) {
      loadCategoryPage(uhg)
    }
    content.appendChild(div)
  }
  document.getElementById('back_button').style.display = "none"
}

function loadCategoryPage(category){
  console.log(category)
  var e = filter(exercises, (x)=>{return x.category == category});
  content.innerHTML = "";
  for (var i in e){
    var div = document.createElement('div');
    div.className = "exercise_list_entry"

    var txtDiv = document.createElement('div')
    txtDiv.className = "exercise_list_entry_text"

    txtDiv.appendChild(document.createTextNode(e[i].name))
    div.appendChild(txtDiv);
    content.append(div)

    const ex = e[i]
    div.onclick = function(ev){
      loadExercisePage(ex);
    }
  }

  var b = document.getElementById('back_button');
  b.style.display = ""
  b.onclick = loadFirstPage;
}

function loadExercisePage(exercise){
  document.getElementById('content').innerHTML = exercise.getHtml();
}

function settingsMenu(){
  console.log('settings menu')
  var a = document.getElementById("settings_menu");
  a.style.display = "block"
  console.log (a.style.display)
}


function filter (collection, func){
  var r = [];
  for (var i in collection){
    if(func(collection[i])){
      r.push(collection[i])
    }
  }
  return r;
}
