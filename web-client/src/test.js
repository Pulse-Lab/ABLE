var Test = function (uid,name){
  this.uid = uid;
  this.name = name;
}

Test.prototype.show = function(){
  console.log(this.uid +" "+this.name)
}

var a = new Test(0,"a")
var b = new Test(1,"b")
var c = new Test(2,"c")


var list = {0:a,1:b,2:c}

// TODO - not 100% sure this works for all things... does Object.assign work for strings and other objects that aren't jsony?
function copyObj (obj){
  const objs = []
  for (var i in obj){
    if (typeof(obj[i])=="object"){
      objs.push(i)
    }
  }
  const o = Object.assign(Object.getPrototypeOf(obj), obj);

  for(var i in objs){
    o[i] = copyObj(obj[i])
  }
  return o
}
