/****************************************************************************
**
**	This program is distributed under the MIT license, 
**	there is a full copy of the license in the root directory(LICENSE.md).
**
****************************************************************************/

(function($){
	$.fn.extend({
		jsbpm:function(process){
			//Type definition
			/*
				1-start
				2-normal-end
				3-terminal-end
				4-task
				5-normal-gateway
				6-parallel-gateway
			*/

			//State definition
			/*
				0-nocolor
				1-blue
				2-green
				3-yellow
				4-red
			*/

			var jsbpmOb={
				canvas:null,
				backgroundColor:"#CED4CD",
				states:[
					{
						id:0,
						name:"nocolor",
						color:"black"
					},
					{
						id:1,
						name:"blue",
						color:"blue"
					},
					{
						id:2,
						name:"green",
						color:"green"
					},
					{
						id:3,
						name:"yellow",
						color:"yellow"
					},
					{
						id:4,
						name:"red",
						color:"red"
					}
				],
				distance:{
					x:300,
					y:150
				},
				getState:function(id){
					var stateReturn=jsbpmOb.states[0];
					$.each(jsbpmOb.states,function(i,state){
						if(state.id==id){
							stateReturn=state;
						}
					});
					return stateReturn;
				},
				getWiredElems:function(wire,elems){
					var wiredElems={
						start:null,
						end:null
					};
					$.each(elems,function(i,elem){
						if(elem.id==wire.startElem){
							wiredElems.start=elem;
						}
						if(elem.id==wire.endElem){
							wiredElems.end=elem;
						}
					});
					return wiredElems;
				},
				getMaxPos:function(elems){
					var x=0;
					var y=0;
					
					$.each(elems,function(i,elem){
						if(elem.x>x){
							x=elem.x;
						}
						if(elem.y>y){
							y=elem.y;
						}
					});
					
					return {
						x:x,
						y:y
					};
				},
				getMaxYPos:function(xPos,elems,min){
					var maxYPos=0;
					$.each(elems,function(i,elem){
						if(elem.x==xPos && elem.y>maxYPos){
							maxYPos=elem.y;
						}
					});
					maxYPos=(maxYPos<min)?min:maxYPos+jsbpmOb.distance.y;
					$.each(elems,function(i,elem){
						if(elem.x==xPos){
							elem.maxYPos=maxYPos;
						}
					});
					return maxYPos;
				},
				isNotPartOfBucle:function(nextWire,process,wiresReviewed){
					
					var isNotPart=true;
					var countRep=0;
					$.each(process.alreadyOrderedWires,function(i,alreadyOrderedWire){
						if(alreadyOrderedWire.startElem==nextWire.startElem && alreadyOrderedWire.endElem==nextWire.endElem){
							countRep++;
						}
					});
					if(countRep!=0){
						var forReview=new Array();
						var level=0;
						
						forReview=jsbpmOb.nextWires(nextWire,process);
						
						do{
							var newForReview= new Array();
							$.each(forReview,function(i,wireArray){
								if(wireArray.endElem==nextWire.startElem){
									isNotPart=false;
									return false;
								}
								else{
									var nextWires=jsbpmOb.nextWires(wireArray,process);
									$.each(nextWires,function(j,newWire){
										newForReview[newForReview.length]=newWire;
									});
								}
							});
							forReview=newForReview;
							if(!isNotPart)
								break;
						}while(level++<10);
					}
					return isNotPart;
					
				},
				nextWires:function(wire,process){
					var wiresResult=new Array();
					$.each(process.wires,function(i,wireArray){
						if(wire.endElem==wireArray.startElem){
							wiresResult[wiresResult.length]=wireArray;
						}
					});
					return wiresResult;
				},
				prevWires:function(wire,process){
					var wiresResult=new Array();
					$.each(process.wires,function(i,wireArray){
						if(wire.startElem==wireArray.endElem){
							wiresResult[wiresResult.length]=wireArray;
						}
					});
					return wiresResult;
				},
				findPrevWire:function(prevWire,wire,process,level){
					var result=true;
					//jsbpmOb.prevWiresArray[jsbpmOb.prevWiresArray.length]=prevWire;
					$.each(jsbpmOb.prevWires(prevWire,process),function(i,wireArray){
						if(wireArray.startElem==wire.startElem && wireArray.endElem==wire.endElem){
							result=false;
							return false;
						}
						else if(level<=40){
						
							result=jsbpmOb.findPrevWire(wireArray,wire,process,level+1);
							if(!result)return false;
						}
						else{
							return false;
						}
					});
					return result;
				},
				orderWires:function(wire,process,XPos,YMin,recalc){
					var wiredElems=jsbpmOb.getWiredElems(wire,process.elems);
					
					wiredElems.end.x=(wiredElems.end.x!= null && wiredElems.end.x>(XPos))?wiredElems.end.x:XPos;
					wiredElems.end.y=(wiredElems.end.y!=null && wiredElems.end.y>(YMin))?wiredElems.end.y:YMin;
					
					
					var wiresToOrder=jsbpmOb.nextWires(wire,process);
					process.alreadyOrderedWires[process.alreadyOrderedWires.length]=wire;
					$.each(wiresToOrder,function(i,wireArray){
						var notIncluded=true;
						var wiresReviewed=new Array();
						var isNotPartOfBucle=jsbpmOb.isNotPartOfBucle(wireArray,process,wiresReviewed);
						if(isNotPartOfBucle){
							YMin=jsbpmOb.orderWires(wireArray,process,XPos+1,YMin,recalc);
							YMin+=1;
						}
					});
						
					return YMin;
				},
				calcPositions:function(process){
					//getting first wire
					var firstWire=null;
					$.each(process.wires,function(i,wire){
						if(wire.startElem==1){
							firstWire=wire;
						}
					});
					
					var wiredElems=jsbpmOb.getWiredElems(firstWire,process.elems);
					wiredElems.start.x=1;
					wiredElems.start.y=1;
					
					process.alreadyOrderedWires=new Array();
					jsbpmOb.orderWires(firstWire,process,2,1,false);
					
					var maxY=jsbpmOb.getMaxPos(process.elems).y;
					console.log(maxY);
					for(var i=1;i<maxY;i++){
						var count=0;
						$.each(process.elems,function(j,elem){
							if(elem.y==i)count++;
						});
						if(count==0){
							//remove row
							var countDeleted=0;
							$.each(process.elems,function(j,elem){
								if(elem.y>i){
									elem.y--;
									countDeleted++;
								}
							});
							if(countDeleted>0)i--;
						}
					}
					
				},
				paintWire:function(wire,elems){
					var wiredElems=jsbpmOb.getWiredElems(wire,elems);
					
					if(wiredElems.start.wasAmplified!=true){
						wiredElems.start.x=wiredElems.start.x*jsbpmOb.distance.x;
						wiredElems.start.y=wiredElems.start.y*jsbpmOb.distance.y;
						wiredElems.start.wasAmplified=true;
					}
					
					
					if(wiredElems.end.wasAmplified!=true){
						wiredElems.end.x=wiredElems.end.x*jsbpmOb.distance.x;
						wiredElems.end.y=wiredElems.end.y*jsbpmOb.distance.y;
						wiredElems.end.wasAmplified=true;
					}
					
					var ctx=jsbpmOb.canvas.getContext("2d");
					ctx.beginPath();
					var stateStart=jsbpmOb.getState(wiredElems.start.state);
					var stateEnd=jsbpmOb.getState(wiredElems.end.state);
					ctx.strokeStyle=(wire.state==1)?"blue":jsbpmOb.states[0].color;
					ctx.lineWidth=(wire.state==1)?4:2;
					ctx.moveTo(wiredElems.start.x,wiredElems.start.y);
					
					//choose if painted up or down
					var count=0;
					var countBreakPoint=0;
					var arrowDirection=1;
					$.each(jsbpmOb.paintedElems,function(i,paintedElem){
						if(paintedElem.x==wiredElems.end.x && paintedElem.y==wiredElems.end.y){
							count++;
						}
						if(wiredElems.start.x==paintedElem.x && wiredElems.end.y==paintedElem.y){
							countBreakPoint++;
						}
					});
					if(wiredElems.end.y==wiredElems.start.y){
						ctx.lineTo(wiredElems.end.x,wiredElems.end.y);
						//ctx.arcTo(wiredElems.start.x, wiredElems.end.y, wiredElems.end.x+20, wiredElems.end.y, 20);
						arrowDirection=1;
					}
					else if(wiredElems.end.y<wiredElems.start.y){
							ctx.lineTo(wiredElems.start.x,wiredElems.end.y+20);
							ctx.arcTo(wiredElems.start.x, wiredElems.end.y, wiredElems.end.x-20, wiredElems.end.y, 20);
							arrowDirection=2;
					}
					else if((count==0 || count%2==0 || countBreakPoint==0)){
						ctx.lineTo(wiredElems.start.x,wiredElems.end.y-20);
						ctx.arcTo(wiredElems.start.x, wiredElems.end.y, wiredElems.end.x+20, wiredElems.end.y, 20);
						arrowDirection=1;
						
					}
					else{
						ctx.lineTo(wiredElems.end.x-20,wiredElems.start.y);
						ctx.arcTo(wiredElems.end.x, wiredElems.start.y, wiredElems.end.x, wiredElems.end.y+20, 20);
						arrowDirection=3;
					}
					ctx.lineTo(wiredElems.end.x,wiredElems.end.y);
					ctx.stroke();
					ctx.closePath();
					
					
					//Drawing arrow
					var prevDistance=0;
					if(wiredElems.end.type==1){
						prevDistance=16;
					}
					else if(wiredElems.end.type==2){
						prevDistance=16;
					}
					else if(wiredElems.end.type==3){
						prevDistance=16;
					}
					else if(wiredElems.end.type==4){
						if(arrowDirection!=3){
							prevDistance=100;
						}
						else{
							prevDistance=25;
						}
					}
					else if(wiredElems.end.type==5){
						prevDistance=24;
					}
					else{
						prevDistance=24;
					}
					
					ctx.beginPath();
					ctx.fillStyle=(wire.state==1)?"blue":jsbpmOb.states[0].color;
					ctx.lineWidth=(wire.state==1)?4:2;
					if(arrowDirection==1){
						ctx.moveTo(wiredElems.end.x-prevDistance,wiredElems.end.y);
						ctx.lineTo(wiredElems.end.x-prevDistance-10,wiredElems.end.y+5);
						ctx.lineTo(wiredElems.end.x-prevDistance-10,wiredElems.end.y-5);
						ctx.lineTo(wiredElems.end.x-prevDistance,wiredElems.end.y);
						ctx.fill();
					}
					else if(arrowDirection==2){
						ctx.moveTo(wiredElems.end.x+prevDistance,wiredElems.end.y);
						ctx.lineTo(wiredElems.end.x+prevDistance+10,wiredElems.end.y+5);
						ctx.lineTo(wiredElems.end.x+prevDistance+10,wiredElems.end.y-5);
						ctx.lineTo(wiredElems.end.x+prevDistance,wiredElems.end.y);
						ctx.fill();
					}
					else{
						console.log(arrowDirection);
						ctx.moveTo(wiredElems.end.x,wiredElems.end.y-prevDistance);
						ctx.lineTo(wiredElems.end.x+5,wiredElems.end.y-prevDistance-10);
						ctx.lineTo(wiredElems.end.x-5,wiredElems.end.y-prevDistance-10);
						ctx.lineTo(wiredElems.end.x,wiredElems.end.y-prevDistance);
						ctx.fill();
					}
					ctx.closePath();
					
					jsbpmOb.paintedElems[jsbpmOb.paintedElems.length]={
						x:wiredElems.end.x,
						y:wiredElems.end.y
					}
					
				},
				paintImageElem:function(elem,size,url){
					var ctx = jsbpmOb.canvas.getContext("2d");
					var posX=elem.x;
					var posY=elem.y;
					var imageObj = new Image();
					imageObj.onload = function() {
						ctx.drawImage(imageObj, posX-(size/2), posY-(size/2),size,size);
					};
					imageObj.src = url;
					//drawing letter
					ctx.textAlign = 'center';
					ctx.font = "bold 12pt Calibri";
					ctx.fillStyle="#B00003";
					var text=elem.name;
					ctx.fillText(text, elem.x, elem.y+(size/2)+15);
				},
				paintStart:function(elem){
					var url='img/open-process.png';
					jsbpmOb.paintImageElem(elem,32,url);
				},
				paintNormalEnd:function(elem){
					var url='img/end-normal-process.png';
					jsbpmOb.paintImageElem(elem,32,url);
				},
				paintTerminalEnd:function(elem){
					var url='img/end-terminal-process.png';
					jsbpmOb.paintImageElem(elem,32,url);
				},
				paintNormalGateway:function(elem){
					var url='img/normal-gate.png';
					jsbpmOb.paintImageElem(elem,48,url);
				},
				paintParallelGateway:function(elem){
					var url='img/paralel-gate.png';
					jsbpmOb.paintImageElem(elem,48,url);
				},
				paintTask:function(elem){
					var ctx = jsbpmOb.canvas.getContext("2d");
					ctx.beginPath();
					ctx.rect(elem.x-100, elem.y-25, 200, 50);
					
					// create radial gradient
					var grd = ctx.createRadialGradient(elem.x, elem.y, 10, elem.x, elem.y, 300);
					// light blue
					grd.addColorStop(0, '#8ED6FF');
					// dark blue
					grd.addColorStop(1, '#004CB3');
					
					ctx.fillStyle = grd;
					ctx.fill();
					ctx.lineWidth = 3;
					var state=jsbpmOb.getState(elem.state);
					ctx.strokeStyle = state.color;
					ctx.stroke();
					ctx.fillStyle = 'black';
					
					ctx.textAlign = 'center';
					ctx.font = "normal 12pt Calibri";
					var text=(elem.name.length>25)?elem.name.substring(0,23)+"...":elem.name;
					ctx.fillText(text, elem.x, elem.y);
				},
				init:function(canvas,process){
					jsbpmOb.canvas=canvas;
					
					jsbpmOb.calcPositions(process);
					
					var maxPos=jsbpmOb.getMaxPos(process.elems);
					var widthCanvas=jsbpmOb.distance.x*(maxPos.x+1);
					var heightCanvas=jsbpmOb.distance.y*(maxPos.y+1);
					
					$(canvas).prop("width",widthCanvas);
					$(canvas).prop("height",heightCanvas);
					$(canvas).css("background-color",jsbpmOb.backgroundColor);
					jsbpmOb.paintedElems=new Array();
					$.each(process.wires,function(i,wire){
						jsbpmOb.paintWire(wire,process.elems);
					});
					$.each(process.elems,function(i,elem){
						
						if(elem.type==1){
							jsbpmOb.paintStart(elem);
						}
						else if(elem.type==2){
							jsbpmOb.paintNormalEnd(elem);
						}
						else if(elem.type==3){
							jsbpmOb.paintTerminalEnd(elem);
						}
						else if(elem.type==4){
							jsbpmOb.paintTask(elem);
						}
						else if(elem.type==5){
							jsbpmOb.paintNormalGateway(elem);
						}
						else{
							jsbpmOb.paintParallelGateway(elem);
						}
					});
					
				}
			};
			jsbpmOb.init(this[0],process);
		}
	});
})(jQuery)
