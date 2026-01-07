// ---------------- CONFIG -----------------
const songs = [
  { title: "Freaking Out the Neighborhood - Mac DeMarco", suggestedBy: ["Oyu","Sunderya"], file: "audio/Freaking Out the Neighborhood - Mac DeMarco.mp3" },
  { title: "Don't tell me - Avril Lavigne", suggestedBy: [], file: "audio/Don't tell me - Avril Lavigne.mp3" },
  { title: "Freaks - Surf Curse", suggestedBy: ["Oyu"], file: "audio/Freaks - Surf Curse.mp3" },
  { title: "Just the Two Of Us - Bill Withers and Grover Washington", suggestedBy: ["Sunderya"], file: "audio/Just the Two Of Us - Bill Withers and Grover Washington.mp3" },
  { title: "Sk8er Boi - Avril Lavigne", suggestedBy: [], file: "audio/Sk8er Boi - Avril Lavigne.mp3" },
  { title: "back to friends - Sombr", suggestedBy: ["Uyanga"], file: "audio/back to friends - Sombr.mp3" },
  { title: "Teenage Dirtbag - Wheatus", suggestedBy: [], file: "audio/Teenage Dirtbag - Wheatus.mp3" },
  { title: "Happier Than Ever - Billie Eilish", suggestedBy: ["Uyanga"], file: "audio/Happier Than Ever - Billie Eilish.mp3" },
  { title: "My Love Mine All Mine - Mitski", suggestedBy: ["Uyanga"], file: "audio/My Love Mine All Mine - Mitski.mp3" },
  { title: "Tek It - Cafune", suggestedBy: ["Minjinsor"], file: "audio/Tek It - Cafune.mp3" },
  { title: "As It was - Harry Styles", suggestedBy: ["Minjinsor"], file: "audio/As It was - Harry Styles.mp3" },
  { title: "Until I found you - Stephen Sanchez", suggestedBy: ["Purevdari"], file: "audio/Until I found you - Stephen Sanchez.mp3" }
];

// ---------------- FIREBASE -----------------
const firebaseConfig = {
  apiKey: "AIzaSyDs49uSDzTMfO2jRKRIuqwD2uMOog_ugdw",
  authDomain: "band-poll.firebaseapp.com",
  projectId: "band-poll",
  storageBucket: "band-poll.firebasestorage.app",
  messagingSenderId: "402114094878",
  appId: "1:402114094878:web:9c060c3b20b48304de0b0f"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------------- DEVICE LOCK -----------------
if(localStorage.getItem("deviceVoted") === "true") {
  document.getElementById("locked").style.display="block";
  document.getElementById("login").style.display="none";
  throw new Error("Device locked");
}

// ---------------- POPULATE USERS -----------------
const usernameSelect = document.getElementById("username");
db.collection("members").get().then(snapshot=>{
  snapshot.forEach(doc=>{
    if(!doc.data().hasVoted){
      const opt=document.createElement("option");
      opt.value=doc.id;
      opt.textContent=doc.id;
      usernameSelect.appendChild(opt);
    }
  });
});

let user, queue=[], index=0;
const audio=new Audio();
const bar=document.getElementById("bar");

// ---------------- LOGIN -----------------
document.getElementById("start").onclick = async () => {
  const name=usernameSelect.value;
  const pass=document.getElementById("password").value;

  if(!name || !pass){
    alert("Enter name and password");
    return;
  }

  const memberDoc = await db.collection("members").doc(name).get();
  if(!memberDoc.exists || memberDoc.data().password !== pass){
    alert("Invalid password");
    return;
  }

  if(memberDoc.data().hasVoted){
    alert("Already voted!");
    return;
  }

  user=name;
  // Remove songs suggested by the current user
  queue=songs.filter(s=>!s.suggestedBy.includes(user));

  document.getElementById("login").style.display="none";
  document.getElementById("player").style.display="block";

  index=0;
  playSong();
};

// ---------------- PLAY SONG -----------------
const songTitle = document.getElementById("song-title");
const albumArt = document.getElementById("album-art");
const lyricsDiv = document.getElementById("lyrics");
const ratingDiv = document.getElementById("rating");

function playSong(){
  if(index >= queue.length){
    // Voting done
    localStorage.setItem("deviceVoted","true");
    document.getElementById("player").style.display="none";
    document.getElementById("done").style.display="block";
    db.collection("members").doc(user).update({hasVoted:true});
    return;
  }

  const song = queue[index];
  audio.src = song.file;
  audio.currentTime = 0;
  audio.play();

  // Load album image
  albumArt.src = `images/${song.title}.jpg`;

  // Load lyrics
  fetch(`lyrics/${song.title}.txt`)
    .then(res => res.text())
    .then(text => lyricsDiv.textContent = text)
    .catch(()=> lyricsDiv.textContent = "Lyrics not found");

  songTitle.textContent = `Listening: ${song.title}`;
  ratingDiv.style.display = "none";
  bar.style.width="0%";

  audio.ontimeupdate = ()=> {
    bar.style.width = (audio.currentTime/audio.duration)*100 + "%";
  };

  audio.onended = ()=> {
    ratingDiv.style.display="block";
  };
}

// ---------------- PLAY / PAUSE -----------------
document.getElementById("playPause").onclick=()=> {
  if(audio.paused) audio.play();
  else audio.pause();
};

// ---------------- SKIP -----------------
// document.getElementById("skip").onclick=()=>{
//   audio.pause();
//   ratingDiv.style.display="block"; // show rating immediately
// };

// ---------------- RATINGS -----------------
document.querySelectorAll(".rating button").forEach(btn=>{
  btn.onclick = ()=>{
    const score = Number(btn.dataset.score);
    const song = queue[index];

    // Update Firestore
    db.collection("ratings").doc(song.title).set({
      totalScore: firebase.firestore.FieldValue.increment(score)
    }, {merge:true});

    index++;
    playSong();
  };
});
