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

// ---------------- FIREBASE CONFIG -----------------
const firebaseConfig = {
  apiKey: "AIzaSyDs49uSDzTMfO2jRKRIuqwD2uMOog_ugdw",
  authDomain: "band-poll.firebaseapp.com",
  projectId: "band-poll",
  storageBucket: "band-poll.appspot.com",
  messagingSenderId: "402114094878",
  appId: "1:402114094878:web:9c060c3b20b48304de0b0f"
};

// ---------------- FIREBASE -----------------
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------------- CHECK IF RESULTS PAGE -----------------
if (window.location.pathname.includes("results.html")) {
  loadResults();
} else {
  // ---------------- DEVICE LOCK -----------------
  if (localStorage.getItem("deviceVoted") === "true") {
    document.getElementById("locked").style.display = "block";
    document.getElementById("login").style.display = "none";
    throw new Error("Device locked");
  }

  // ---------------- USERS -----------------
  const usernameSelect = document.getElementById("username");
  db.collection("members").get().then(snap => {
    snap.forEach(doc => {
      if (!doc.data().hasVoted) {
        const o = document.createElement("option");
        o.value = doc.id;
        o.textContent = doc.id;
        usernameSelect.appendChild(o);
      }
    });
  });

  let user;
  let queue = [];
  let index = 0;
  let userRatings = {}; // LOCAL ONLY

  const audio = new Audio();
  const bar = document.getElementById("bar");

  const songTitle = document.getElementById("song-title");
  const albumArt = document.getElementById("album-art");
  const lyricsDiv = document.getElementById("lyrics");
  const ratingDiv = document.getElementById("rating");

  // ---------------- LOGIN -----------------
  document.getElementById("start").onclick = async () => {
    const name = usernameSelect.value;
    const pass = document.getElementById("password").value;

    if (!name || !pass) return alert("Missing info");

    const doc = await db.collection("members").doc(name).get();
    if (!doc.exists || doc.data().password !== pass) return alert("Wrong password");
    if (doc.data().hasVoted) return alert("Already voted");

    user = name;
    queue = songs.filter(s => !s.suggestedBy.includes(user));
    index = 0;

    document.getElementById("login").style.display = "none";
    document.getElementById("player").style.display = "block";

    playSong();
  };

  // ---------------- PLAY SONG -----------------
  function playSong() {
    if (index >= queue.length) {
      submitAllRatings();
      return;
    }

    const song = queue[index];

    audio.src = song.file;
    audio.currentTime = 0;
    audio.play();

    songTitle.textContent = song.title;
    albumArt.src = `images/${song.title}.jpg`;

    fetch(`lyrics/${song.title}.txt`)
      .then(r => r.text())
      .then(t => lyricsDiv.textContent = t)
      .catch(() => lyricsDiv.textContent = "");

    ratingDiv.style.display = "none";
    bar.style.width = "0%";

    audio.ontimeupdate = () => {
      bar.style.width = (audio.currentTime / audio.duration) * 100 + "%";
    };

    audio.onended = () => {
      ratingDiv.style.display = "block";
    };
  }

  // ---------------- CONTROLS -----------------
  document.getElementById("playPause").onclick = () => {
    audio.paused ? audio.play() : audio.pause();
  };

  document.getElementById("skip").onclick = () => {
    audio.pause();
    ratingDiv.style.display = "block";
  };

  // ---------------- RATE -----------------
  document.querySelectorAll(".rating button").forEach(btn => {
    btn.onclick = () => {
      const score = Number(btn.dataset.score);
      userRatings[queue[index].title] = score;
      index++;
      playSong();
    };
  });

  // ---------------- FINAL SUBMIT -----------------
  async function submitAllRatings() {
    const batch = db.batch();

    // Write aggregate scores
    for (const [title, score] of Object.entries(userRatings)) {
      const ref = db.collection("ratings").doc(title);
      batch.set(ref, {
        totalScore: firebase.firestore.FieldValue.increment(score)
      }, { merge: true });
    }

    // Write per-user votes
    const userRef = db.collection("votes").doc(user);
    batch.set(userRef, { ratings: userRatings }, { merge: true });

    // Mark user as voted
    batch.update(db.collection("members").doc(user), { hasVoted: true });

    await batch.commit();

    localStorage.setItem("deviceVoted", "true");

    document.getElementById("player").style.display = "none";
    document.getElementById("done").style.display = "block";
  }
}

// ---------------- RESULTS PAGE -----------------
async function loadResults() {
  const resultsContainer = document.getElementById("results-container");
  
  try {
    // Get all votes
    const votesSnapshot = await db.collection("votes").get();
    const allVotes = {};
    
    votesSnapshot.forEach(doc => {
      allVotes[doc.id] = doc.data().ratings || {};
    });

    // Create results display
    let html = '<h1>Band Vote Results</h1>';
    
    // Display by song
    html += '<h2>Results by Song</h2>';
    songs.forEach(song => {
      html += `<div class="song-results">`;
      html += `<h3>${song.title}</h3>`;
      html += `<table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>`;
      
      let totalScore = 0;
      let ratingCount = 0;
      
      for (const [member, ratings] of Object.entries(allVotes)) {
        if (ratings[song.title] !== undefined) {
          html += `<tr>
            <td>${member}</td>
            <td>${ratings[song.title]}</td>
          </tr>`;
          totalScore += ratings[song.title];
          ratingCount++;
        }
      }
      
      html += `</tbody></table>`;
      
      if (ratingCount > 0) {
        const avgScore = (totalScore / ratingCount).toFixed(2);
        html += `<p><strong>Total Score:</strong> ${totalScore} | <strong>Average:</strong> ${avgScore}</p>`;
      } else {
        html += `<p>No ratings yet</p>`;
      }
      
      html += `</div>`;
    });

    // Display by member
    html += '<h2>Results by Member</h2>';
    for (const [member, ratings] of Object.entries(allVotes)) {
      html += `<div class="member-results">`;
      html += `<h3>${member}</h3>`;
      html += `<table>
        <thead>
          <tr>
            <th>Song</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>`;
      
      for (const [songTitle, score] of Object.entries(ratings)) {
        html += `<tr>
          <td>${songTitle}</td>
          <td>${score}</td>
        </tr>`;
      }
      
      html += `</tbody></table></div>`;
    }

    resultsContainer.innerHTML = html;
  } catch (error) {
    console.error("Error loading results:", error);
    resultsContainer.innerHTML = '<p>Error loading results. Please try again.</p>';
  }
}
