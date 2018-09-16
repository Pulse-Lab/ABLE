import Exercise from "./Exercise.js"
import Util from "./Util.js"

try{
  window.WebSocket = window.WebSocket || window.MozWebSocket;
} catch (e){
  alert("Could not initialize WebSocket - please make sure you are using a modern browser or try refreshing the page.")
  console.log(e);
}

var ws;

try{
  ws = new WebSocket ("ws://"+location.hostname+":"+location.port, 'echo-protocol');
} catch (e){
  alert("Could not connect to server, please try refreshing the page.")
  console.log("Couldn't connect to ws: "+e)
}

ws.addEventListener('message', function(message){
  console.log("message: "+msg.type)
})



var content = document.getElementById("content")

var exercises={};
var request = new XMLHttpRequest();
request.open("GET", 'exercises.json', true);
request.responseType = "json"
request.onload = function() {
   if(request.readyState != 4) throw Error("readyState != 4");
   if(request.status != 200) throw Error("status != 200");
   if(request.response == null) throw Error("JSON response null");
   for (var i in request.response){
     exercises[i] = new Exercise(parseInt(i),request.response[i]);
   }
   loadFirstPage();
 }
request.send();


document.getElementById('settings').onclick = (x)=>{document.getElementById('settings_menu').style.display="block"}
document.getElementById('close').onclick = hideSettingsMenu;
document.getElementById('setup').onclick = loadSetupPage

function loadFirstPage(){
  hideSettingsMenu();
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
  // document.getElementById('back_button').style.display = "none"
  document.getElementById('back_button').hidden = true;

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
  // b.style.display = ""
  b.hidden = false;
  b.onclick = loadFirstPage;
}

function loadExercisePage(exercise){
  var msg = {type:"change-exercise", value:exercise.name};
  try{
    ws.send(JSON.stringify(msg))
  }catch(e){
    console.log("WARNing: could not send change exercise message: "+e)
  }
  document.getElementById("back_button").onclick = (x)=>{loadCategoryPage(exercise.category);}
  document.getElementById('content').innerHTML = "";
  document.getElementById('content').appendChild(exercise.getHtml());
}

function loadSetupPage(){
  hideSettingsMenu();
  var updatedExercises = {}
  Object.keys(exercises).forEach(function(key){
    updatedExercises[key] = exercises[key].clone();
  })

  var content = document.getElementById('content')
  content.innerHTML =""

  var setup = document.createElement('div')
  setup.className = "exercise_setup_container"

  for (var i in updatedExercises){
    setup.appendChild(updatedExercises[i].getSetterHTML(updatedExercises))
  }

  content.appendChild(setup);

  var newExercise = document.createElement('div')
  newExercise.className = "exercise_setup_new"
  newExercise.appendChild(document.createTextNode("  +  New Exercise"))
  newExercise.onclick = function(){
    var newUID = -Infinity;
    for(var i in updatedExercises){
      newUID = newUID<updatedExercises[i].uid?updatedExercises[i].uid:newUID;
    }
    newUID +=1;
    updatedExercises[newUID] = new Exercise(newUID);
    var newDiv = updatedExercises[newUID].getSetterHTML(updatedExercises);
    newDiv.style.background = "var(--panel-color)"; // slightly different to show it's new
    setup.appendChild(newDiv);
    setup.scrollTo(0,setup.scrollHeight);
  }



  content.appendChild(newExercise);

  var save = document.createElement('input');
  save.value = "save";
  save.type ="button"
  save.className = "exercise_setup_save"
  save.onclick = function(){

    var msg = {
      type:"updateExercises",
      value:updatedExercises
    }
    try{
      console.log(updatedExercises);
      ws.send(JSON.stringify(msg))
      exercises = updatedExercises;
      console.log("changes saved")
    } catch (e){
      alert("Oops, there was an error saving changes - please refresh the page and try again.")
    }
    loadSetupPage();
  }

  content.appendChild(save)

  var b = document.getElementById('back_button');
  // b.style.display = ""
  b.hidden = false;
  b.onclick = loadFirstPage;
}


function hideSettingsMenu(){
  document.getElementById('settings_menu').style.display="none"
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
