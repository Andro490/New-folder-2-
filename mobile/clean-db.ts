import { initializeApp } from "firebase/app";
import { getDatabase, ref, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBLegQGMSL0fq23DTfp_Dln1TNqC0njUQU",
  authDomain: "amdam-886f2.firebaseapp.com",
  databaseURL: "https://amdam-886f2-default-rtdb.firebaseio.com",
  projectId: "amdam-886f2",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function clean() {
  console.log("Cleaning old database entries...");
  await remove(ref(database, "matchmaking"));
  await remove(ref(database, "rooms"));
  console.log("Cleaned!");
  process.exit(0);
}

clean();
