
var url = "ws://localhost:8090/gapi-ws"
var gapiKey = "FKDJFSDKLFJSDFFD";
var workflowKey = "249C65374810";
var sttHelloNodekey = "74EE56AAE982";
var initialSttNodeKey = "74EE56AAE982";
var operationSwitchNodeKey = "B89734AB1176";

var mediaPlayer;
var workflowMode = "idle";
var mode = "init";
var ws;

var isProcessing = false;

var messageTimer;
var retryConnectTime = 6000;
var messageInterval = 60000;

var audioContext;
var streamInProcess;
var sampleRate;
var audioInput;
var recordder;
var outputSampleRate = 16000;

function onLoad() {

  showOptions();
  connect();
  
  assertMediaPlayer();

  requestLocalAudio();
}

function connect() {

  ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";

  ws.onopen = function() {

    console.log("Websocket: connected");

    startMessageTimer();
    mode = "sendStartSession";
    
    {
      let o = {
        key: gapiKey,
        apiServiceName: 'hello'
      }

      sendMsg(o);
    }

    {
      let o = {
        key: gapiKey,
        apiServiceName: 'watchWorkflow',
        workflowKey: workflowKey
      }

      sendMsg(o);
    }
  };

  ws.onmessage = function (evt) { 

    var msg = evt.data;

    console.log("onMessage: " + msg);

    if (msg instanceof ArrayBuffer) {

      console.log("Got chunk playing------------>size: " + msg.byteLength);
      var dataArray = new Uint8Array(msg);
      mediaPlayer.feed(dataArray);
      return;
    }

    var o = JSON.parse(msg);
    if (o.data) {

      var meetingResponse = JSON.parse(o.data);

      console.log("meetingResponse: " + meetingResponse);

      if (meetingResponse.switchNodePathTaken == "A") {

        doneWithOptions();
        assignProfile(meetingResponse.requestedPerson, "profile-" + meetingResponse.requestedPerson + ".png");
      }
      else if (meetingResponse.switchNodePathTaken == "B") {

        doneWithOptions();
        assignProfile("", "lobby.png");
        document.getElementById("chat").innerHTML = "Got it. Can you place the package(s) by the kiosk please?";
        setTimeout(() => {
          reset();
        }, 6000);
      }
      else if (meetingResponse.switchNodePathTaken == "C") {

        doneWithOptions();
        assignProfile("", "profile-jane.png");
          document.getElementById("chat").innerHTML = "Let me get someone to help. One minute please.";
        setTimeout(() => {
          reset();
        }, 6000);          
      }

      if (meetingResponse.employeeResponse) {

        document.getElementById("chat").innerHTML = meetingResponse.employeeResponse;
        
        setTimeout(() => {
          reset();
        }, 6000);
      }
    }

    if (mode == "sendStartSession") {

      mode = "receivedStartSessionAck";
      let o = {
        key: gapiKey,
        apiServiceName: "liveSpeechToText",
        action: "startApiSession",
        routeWorkflowKey: workflowKey,
        routeNodeKey: sttHelloNodekey
      }

      sendMsg(o);
    }
  };

  ws.onclose = function() { 

    console.log("[ERROR] Websocket: closed");
    stopMessageTimer();
    setTimeout(connect, retryConnectTime);
  };

  ws.onerror = function(e) {

    console.log("Websocket: error: " + e.data);
  }

  /*
  document.getElementById("textElem")
    .addEventListener("keyup", function(event) {

      event.preventDefault();
      if (event.keyCode === 13) {
          var text = this.value;
          sendRequest(text);
          this.value = "";
      }
    });
    document.getElementById("gapiKeyElement").innerHTML = gapiKey;
    */
 
}

function assertMediaPlayer() {

  if (mediaPlayer) { return; }

  console.log("assertMediaPlayer()");

  mediaPlayer = new PCMPlayer({
    encoding: '16bitInt',
    channels: 1,
    sampleRate: 44100,
    flushingTime: 25
  });
}

function PCMPlayer(t){this.init(t)}PCMPlayer.prototype.init=function(t){this.option=Object.assign({},{encoding:"16bitInt",channels:1,sampleRate:8e3,flushingTime:1e3},t),this.samples=new Float32Array,this.flush=this.flush.bind(this),this.interval=setInterval(this.flush,this.option.flushingTime),this.maxValue=this.getMaxValue(),this.typedArray=this.getTypedArray(),this.createContext()},PCMPlayer.prototype.getMaxValue=function(){var t={"8bitInt":128,"16bitInt":32768,"32bitInt":2147483648,"32bitFloat":1};return t[this.option.encoding]?t[this.option.encoding]:t["16bitInt"]},PCMPlayer.prototype.getTypedArray=function(){var t={"8bitInt":Int8Array,"16bitInt":Int16Array,"32bitInt":Int32Array,"32bitFloat":Float32Array};return t[this.option.encoding]?t[this.option.encoding]:t["16bitInt"]},PCMPlayer.prototype.createContext=function(){this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.gainNode=this.audioCtx.createGain(),this.gainNode.gain.value=1,this.gainNode.connect(this.audioCtx.destination),this.startTime=this.audioCtx.currentTime},PCMPlayer.prototype.isTypedArray=function(t){return t.byteLength&&t.buffer&&t.buffer.constructor==ArrayBuffer},PCMPlayer.prototype.feed=function(t){if(this.isTypedArray(t)){t=this.getFormatedValue(t);var e=new Float32Array(this.samples.length+t.length);e.set(this.samples,0),e.set(t,this.samples.length),this.samples=e}},PCMPlayer.prototype.getFormatedValue=function(t){t=new this.typedArray(t.buffer);var e,i=new Float32Array(t.length);for(e=0;e<t.length;e++)i[e]=t[e]/this.maxValue;return i},PCMPlayer.prototype.volume=function(t){this.gainNode.gain.value=t},PCMPlayer.prototype.destroy=function(){this.interval&&clearInterval(this.interval),this.samples=null,this.audioCtx.close(),this.audioCtx=null},PCMPlayer.prototype.flush=function(){if(this.samples.length){var t,e,i,n,a,s=this.audioCtx.createBufferSource(),r=this.samples.length/this.option.channels,o=this.audioCtx.createBuffer(this.option.channels,r,this.option.sampleRate);for(e=0;e<this.option.channels;e++)for(t=o.getChannelData(e),i=e,a=50,n=0;n<r;n++)t[n]=this.samples[i],n<50&&(t[n]=t[n]*n/50),r-51<=n&&(t[n]=t[n]*a--/50),i+=this.option.channels;this.startTime<this.audioCtx.currentTime&&(this.startTime=this.audioCtx.currentTime),console.log("start vs current "+this.startTime+" vs "+this.audioCtx.currentTime+" duration: "+o.duration),s.buffer=o,s.connect(this.gainNode),s.start(this.startTime),this.startTime+=o.duration,this.samples=new Float32Array}};

function startMessageTimer() {
    if (messageTimer) {
        clearInterval(messageTimer);
    }
    messageTimer = setInterval(function() {
        if (ws && ws.readyState === WebSocket.OPEN) {

            let o = {
              key: "",
              apiServiceName: "ping"
            }

            sendMsg(o);
        }
    }, messageInterval);
}

function stopMessageTimer() {
    if (messageTimer) {
        clearInterval(messageTimer);
        messageTimer = null;
    }
}

function sendMsg(o) {

  let asString = JSON.stringify(o);
  console.log("sendRequest: " + asString);
  ws.send(asString);
}

function sendRequest(obj) {

  sendMsg(obj);
}

function startClick() {

  console.log("startClick()");

  let dataObj = {
    speechText: "hello"
  }

  let o = {
    key: gapiKey,
    apiServiceName: "workflowInvoke",
    wfKey: workflowKey,
    nodeKey: initialSttNodeKey,
    data: dataObj
  }

  sendRequest(o);

  showOptions();
}

function showOptions() {

  isProcessing = true;
  var img = document.getElementById("animation");
  img.src = "ring-faster.svg";

  let s = "You can say things like:<br>\"I have a meeting with Jane\"<br>or \"I have a package\"";

  console.log("Sending req");
  document.getElementById("instructions1").innerHTML = "";
  document.getElementById("whatYouCanDo").innerHTML = s;

  document.getElementById("start-button").style.display = "none";
  document.getElementById("op-button-1").style.display = "inline-block";
  document.getElementById("op-button-2").style.display = "inline-block";
  document.getElementById("op-button-3").style.display = "inline-block";
}

function doneWithOptions() {
  
  document.getElementById("instructions1").innerHTML = "Working on it...";

  //clear
  document.getElementById("reset-button").style.display = "inline-block";
  document.getElementById("whatYouCanDo").innerHTML = "";
  document.getElementById("instructions2").style.display = "none";
  document.getElementById("op-button-1").style.display = "none";
  document.getElementById("op-button-2").style.display = "none";
  document.getElementById("op-button-3").style.display = "none";
}

function reset() {

  workflowMode = "idle";
  isProcessing = false;
  var img = document.getElementById("animation");
  img.src = "ring-slow.svg";
  document.getElementById("reset-button").style.display = "none";
  document.getElementById("instructions1").innerHTML = "Try saying \"Hello!\"...";
  document.getElementById("whatYouCanDo").innerHTML = "";
  document.getElementById("instructions2").style.display = "inline-block";
  document.getElementById("start-button").style.display = "inline-block";
  document.getElementById("op-button-1").style.display = "none";
  document.getElementById("op-button-2").style.display = "none";
  document.getElementById("op-button-3").style.display = "none";
  document.getElementById("profile-container").style.display = "none";
  document.getElementById("chat").innerHTML = "";
  showOptions();
}

function assignProfile(name, imgUrl) {
  
  document.getElementById("profile-container").style.display = "inline-block";
  var img = document.getElementById("profile-image");
  img.src = imgUrl;
  img.height = 200;
  document.getElementById("profile-text").innerHTML = name;
}

function sendOperation(opType) {

  console.log("sendOperation()");

  let speechText = "";
  if (opType == "meeting") {
    speechText = "I'm here for a meeting";
  }
  else if (opType == "package") {
    speechText = "I have a package";
  }
  else {
    speechText = "help";
  }

  let value = {
    requestedAction: opType,
    requestedPerson: "jane",
    speechText: speechText
  }

  let o = {
    key: gapiKey,
    apiServiceName: "workflowInvoke",
    wfKey: workflowKey,
    nodeKey: operationSwitchNodeKey,
    data: value
  }

  sendRequest(o);
  doneWithOptions();
}

function requestLocalAudio() {

console.log("RequestLocalAudio...");
navigator.mediaDevices
  .getUserMedia({ audio: true, video: false })
  .then((stream) => {

    setupAudioStreams(stream);
    //this.resourceService.notifyUserAgentStartedMedia(); // to start background media player
  })
  .catch((err) => {
    console.log("Can't init audio: " + err);
  });
}

function setupAudioStreams(stream) {

  console.log("Setting up audio context");
  audioContext = new AudioContext();
  streamInProcess = stream;
  sampleRate = audioContext.sampleRate;
  console.log("Sample rate of local audio: " + sampleRate)
  
  audioInput = audioContext.createMediaStreamSource(stream);
  var bufferSize = 4096;
  var inputChannelCount = 1;
  var outputChannelCount = 1;
  recorder = audioContext.createScriptProcessor(bufferSize, inputChannelCount, outputChannelCount);
  startAudioRunnable();
}

function startAudioRunnable() {

  console.log("startRivaSession");
  if (!document) { return; }
      
  let elem = document.getElementById("audioWorker");
  if (!elem) {
    console.log("[ERROR] can't find audioworker");
    return;
  }

  let textContent = elem.textContent;
  // Blob based worker to do audio conversion in the background
  var blob = new Blob([
    textContent
  ], { type: "text/javascript" })

  // Note: window.webkitURL.createObjectURL() in Chrome 10+.
  let worker = new Worker(window.URL.createObjectURL(blob));

  worker.postMessage({
    command: 'init',
    config: {
      sampleRate: sampleRate,
      outputSampleRate: outputSampleRate
    }
  });

  // Use a worker thread to resample the audio, then send to server
  this.recorder.onaudioprocess = (audioProcessingEvent) => {

    let inputBuffer = audioProcessingEvent.inputBuffer;
    worker.postMessage({
      command: 'convert',
      // We only need the first channel
      buffer: inputBuffer.getChannelData(0)
    });

    worker.onmessage = (msg) =>{

      if (msg.data.command == 'newBuffer') {

        //console.log("Audio bytes: " + msg.data.resampled.buffer.byteLength);
        ws.send(msg.data.resampled.buffer);
      }
    };
  };

  // connect stream to our recorder
  audioInput.connect(this.recorder);
  // connect our recorder to the previous destination
  recorder.connect(this.audioContext.destination);

  console.log("Audio pipeline setup OK");
}
