window.AudioContext = window.AudioContext || window.webkitAudioContext;
var recIndex = 0;

var audioContext = null;
var audioInput = null,
    realAudioInput = null,
    inputPoint = null;
var rafID = null;
var smoothMax = 0;
var scaleMax = 0;
var fricative = 0;
var previousFricative = 0;
var progress;
var voiced = 0;
var wasVoiced = false;
var voicing = false;
var fricative = false;
var Pitch = 0;
var vol1 = 0;
var vol2 = 100;
var fricValue = 0;
var lastAc = 0;

function convertToMono(input) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect(splitter);
    splitter.connect(merger, 0, 0);
    splitter.connect(merger, 0, 1);
    return merger;
}

function cancelAnalyserUpdates() {
    window.cancelAnimationFrame(rafID);
    rafID = null;
}

var volumeList = [];
var smoothZeroCrossing = 0;
var smoothDirectionChanges = 0;

var buflen = 2048;
var buf = new Float32Array(buflen);
var previouslog = 0;
var soundCounter = 0;
var soundDone = false;
var soundDuration = 0;

var progressWidth;

function updateAnalysers(time) {
    // Spectral centroid
    //    var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);
    //    analyserNode.getByteFrequencyData(freqByteData); // frequency data from VOCA
    //
    //    var numerator = 0;
    //    var denominator = 0;
    //    for (var k = 0; k < freqByteData.length; k++) {
    //        numerator += Math.pow(k, 1) * Math.abs(freqByteData[k]);
    //        denominator += freqByteData[k];
    //    }
    //
    //    var spectralCentroid = Math.floor(numerator / denominator);

    var multiplier = audioContext.sampleRate / 11000; // compensate for machine with different sample rates
    var previous = 0;
    var previous2 = 0;
    var zeroCrossing = 0;
    var directionChanges = 0;
    var max = 0;

    analyserNode.getFloatTimeDomainData(buf);

    for (var i = 0; i < buf.length / 2; ++i) {
        if (buf[i] > max)
            max = buf[i];
        if (buf[i] < 0 && previous > 0) // zero crossing / 2
            zeroCrossing++;
        if (buf[i] < previous && previous > previous2) // Was going up, now going down
            directionChanges++;
        previous2 = previous;
        previous = buf[i];
        // calculate if got noise here
    }
    max *= 100;
    zeroCrossing *= multiplier;
    directionChanges *= multiplier;
    var ac = autoCorrelate(buf, audioContext.sampleRate); // anything over 1000 is not singing
    smoothMax = Math.floor((3 * smoothMax + max) / 4);
    smoothZeroCrossing = Math.floor((7 * smoothZeroCrossing + zeroCrossing) / 8);
    smoothDirectionChanges = Math.floor((7 * smoothDirectionChanges + directionChanges) / 8);
    fricValue = 0;
    if (smoothMax >= nouislider.noUiSlider.get()[0]) { // between left and right volume slider
        if (smoothDirectionChanges / 2 > smoothZeroCrossing && ac < 1000) {
            progressHz.style.width = (Math.min(ac, 500) * progressWidth / 500).toString() + "vw";
            voicing = true;
            fricative = false;
            Pitch = ac;
            voiced = (voiced + 1) / 2;
            console.log("Pitch", Pitch, smoothMax, smoothZeroCrossing, smoothDirectionChanges, " :v ", voiced, ac, voicing);
            progressz.style.width = 0;
            if (ac != -1)
                lastAc = Pitch;
        } else if (smoothDirectionChanges / 2 > smoothZeroCrossing) {
            progressHz.style.width = 0;
            voicing = true;
            fricative = true;
            Pitch = 0;
            ac = 1000 + (ac / 4);
            fricValue = ac;
            progressz.style.width = ((Math.min(ac, 8000) - 1000) * progressWidth / 7000).toString() + "vw";
            console.log("Voiced fricative", smoothMax, smoothZeroCrossing, smoothDirectionChanges, " :V ", voiced, ac, voicing); // scale voiced fricative
            if (ac != -1)
                lastAc = ac;
        } else { // devoiced seems to ve voice for first few frames
            progressHz.style.width = 0;
            voicing = false;
            fricative = true;
            Pitch = 0;
            ac = 5000 + (ac / 3);
            fricValue = ac;
            progressz.style.width = ((Math.min(ac, 8000) - 1000) * progressWidth / 7000).toString() + "vw";
            console.log("Unvoiced fricative", smoothMax, smoothZeroCrossing, smoothDirectionChanges, " : ", ac, voicing); //  scale unvoiced fricative
            if (ac != -1)
                lastAc = ac;
        }
        previouslog = 1;
        soundCounter++;
    } else {
        progressHz.style.width = 0;
        progressz.style.width = 0;
        voicing = false;
        fricative = false;
        if (previouslog != 0) {
            soundDone = true;
            soundDuration = soundCounter;
            wasVoiced = voiced;
            voiced = 0;
            soundCounter = 0;
            console.log("Last utterance", 0, ac, soundDuration, wasVoiced, lastAc);
        }
        previouslog = 0;
    }
    progress.style.width = (progressWidth * smoothMax / 100).toString() + "vw";
    rafID = window.requestAnimationFrame(updateAnalysers);
    return;
}

function autoCorrelate(buf, sampleRate) {
    // Implements the ACF2+ algorithm
    var SIZE = buf.length;
    var rms = 0;

    for (var i = 0; i < SIZE; i++) {
        var val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) // not enough signal
        return -1;

    var r1 = 0,
        r2 = SIZE - 1,
        thres = 0.2;
    for (var i = 0; i < SIZE / 2; i++)
        if (Math.abs(buf[i]) < thres) {
            r1 = i;
            break;
        }
    for (var i = 1; i < SIZE / 2; i++)
        if (Math.abs(buf[SIZE - i]) < thres) {
            r2 = SIZE - i;
            break;
        }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    var c = new Array(SIZE).fill(0);
    for (var i = 0; i < SIZE; i++)
        for (var j = 0; j < SIZE - i; j++)
            c[i] = c[i] + buf[j] * buf[j + i];

    var d = 0;
    while (c[d] > c[d + 1]) d++;
    var maxval = -1,
        maxpos = -1;
    for (var i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    var T0 = maxpos;

    var x1 = c[T0 - 1],
        x2 = c[T0],
        x3 = c[T0 + 1];
    a = (x1 + x3 - 2 * x2) / 2;
    b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return Math.floor(sampleRate / T0);
}

function gotStream(stream) {
    inputPoint = audioContext.createGain();
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

    //    audioInput = convertToMono( input );

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect(analyserNode);
    updateAnalysers();
}

function initAudio() {
    AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    var soundNotAllowed = function (error) {
        console.log(error);
        navigator.getUserMedia({
            audio: true
        }, gotStream, function (e) {
            alert('Error getting audio');
            console.log(e);
        });
    }

    navigator.mediaDevices.getUserMedia({
            audio: true
        })
        .then(gotStream)
        .catch(soundNotAllowed);
}

function startAudio() {
    if (audioContext == null) {
        progressWidth = parseInt(progressback.style.width);
        //        audioContext = new AudioContext();
        initAudio();
    }
}
