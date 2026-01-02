document.addEventListener('DOMContentLoaded', async function () {
  let currentPath = window.location.pathname.split('/play/')[1];
  const video = document.getElementById('videoPlayer');
  const COUNTFROM = 3;
  let nextFile, prevFile;
  await fetchAdjacentFiles();

  //! Playing logic
  video.addEventListener('canplaythrough', () => {
    video.play();
  });
  video.addEventListener('ended', async () => {
    localStorage.removeItem(`timestamp_${currentPath}`);
    await fetchAdjacentFiles();
    if (!nextFile) alert('No more videos.');
    else handleNextCounter();
  });

  //! Save Logic
  restoreTimestamp();
  video.addEventListener('timeupdate', () => {
    localStorage.setItem(`timestamp_${currentPath}`, video.currentTime);
  });

  function restoreTimestamp() {
    const timestamp = localStorage.getItem(`timestamp_${currentPath}`);
    if (timestamp) video.currentTime = timestamp;
  }

  async function fetchAdjacentFiles() {
    const res = await fetch(`/adjacent/${currentPath}`);
    const data = await res.json();
    nextFile = data.nextFile;
    prevFile = data.prevFile;
    if (nextFile) document.getElementById('nextButton').classList.remove('hidden');
    else document.getElementById('nextButton').classList.add('hidden');
    if (prevFile) document.getElementById('prevButton').classList.remove('hidden');
    else document.getElementById('prevButton').classList.add('hidden');
  }

  function handleNextCounter() {
    const nextButton = document.getElementById('nextButton');
    const countdownCircle = document.getElementById('countdownCircle');
    let countdown = COUNTFROM;
    let countdownTimer;
    nextButton.classList.add('invert');
    countdownCircle.classList.remove('hidden');

    countdownTimer = setInterval(() => {
      if (countdown <= 1) {
        countdown = COUNTFROM + 1;
        clearInterval(countdownTimer);
        nextButton.classList.remove('invert');
        countdownCircle.classList.add('hidden');
        handlePlay();
      }

      countdown--;
      countdownCircle.textContent = countdown;
    }, 1000);
  }

  async function handlePlay(prev = false) {
    currentPath = prev ? prevFile : nextFile;
    const nextTitle = currentPath.split('/').slice(-1)[0].split('.').slice(0, -1).join('.');
    document.getElementById('videoSource').src = `/stream/${currentPath}`;
    history.pushState({}, nextTitle, `/play/${currentPath}`);
    document.getElementById('currentTitle').textContent = nextTitle;
    await fetchAdjacentFiles();
    video.load();
    restoreTimestamp();
    video.play();

    if (document.fullscreenElement) {
      video.requestFullscreen();
    }
  }

  document.getElementById('prevButton').addEventListener('click', () => handlePlay(true));
  document.getElementById('nextButton').addEventListener('click', () => handlePlay());
});
