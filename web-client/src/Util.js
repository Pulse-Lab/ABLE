
var Util ={};

Util.dom = function(type, properties,children){
  var r = document.createElement(type);
  for (var i in properties){
    r[i] = properties[i]
  }

  for (var i in children){
    r.appendChild(children[i])
  }
  return r
}

// takes an Exercise as input
Util.timeInputWidget = function (initialMin=0,initialSec=0,containerProperties){
  var container = Util.dom("div",containerProperties);
  var minutes = Util.dom("input",{type:"number",value:initialMin, min:0,step:1, className:"setTimer_minutes"});
  var divider = Util.dom("div",{innerHTML:":",className:"setTimer_divider"});
  var seconds = Util.dom("input",{type:"number",value:initialSec, min:0,max:59,className:"setTimer_seconds"});

  container.appendChild(minutes);
  container.appendChild(divider);
  container.appendChild(seconds);

  seconds.onchange = function(){
    minutes.value = Util.clip(parseInt(minutes.value) + Math.floor(seconds.value/60),0,Infinity);
    seconds.value = Util.clip(seconds.value%60,0,Infinity);;
    container.timerValue = {minutes:Math.floor(minutes.value), seconds:seconds.value}
  }
  minutes.onchange = function(){
    minutes.value = Util.clip(minutes.value, 0, Infinity);
    container.timerValue = {minutes:Util.clip(minutes.value,0,Infinity), seconds:Util.clip(seconds.value,0,Infinity)}
  };

  return container
}

// uhg - num to string. so value 1 becomes 01, etc...
Util.toZeros = function (val){
  console.log("toz")
  if(parseFloat(val)>=10){
    return val+""
  } else{
    return "0"+parseFloat(val)
  }
}


Util.displayTimerWidget = function (containerProperties){

}


Util.clip = function (num,min,max){
  return Math.max(min,Math.min(num,max))
}

export default Util;
