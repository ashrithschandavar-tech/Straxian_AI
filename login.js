import { auth } from './firebase.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const email = document.getElementById('email');
const password = document.getElementById('password');

document.getElementById('loginBtn').onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .then(() => {
      const action = sessionStorage.getItem("postLoginAction");
      sessionStorage.removeItem("postLoginAction");

      if (action === "generate") {
        window.location.href = "index.html?autoGenerate=true";
      } else {
        window.location.href = "index.html";
      }
    })
    .catch(err => alert(err.message));
};

document.getElementById('signupBtn').onclick = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .then(() => {
      const action = sessionStorage.getItem("postLoginAction");
      sessionStorage.removeItem("postLoginAction");

      if (action === "generate") {
        window.location.href = "index.html?autoGenerate=true";
      } else {
        window.location.href = "index.html";
      }
    })
    .catch(err => alert(err.message));
};

document.getElementById('googleBtn').onclick = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(() => {
      const action = sessionStorage.getItem("postLoginAction");
      sessionStorage.removeItem("postLoginAction");

      if (action === "generate") {
        window.location.href = "index.html?autoGenerate=true";
      } else {
        window.location.href = "index.html";
      }
    })
    .catch(err => alert(err.message));
};

