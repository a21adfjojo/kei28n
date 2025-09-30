const threadsContainer = document.getElementById("threads");
const newThreadBtn = document.getElementById("new-thread-btn");
const boardSelect = document.getElementById("board-select");

async function fetchThreads() {
  try {
    const res = await fetch("/api/threads");
    const threads = await res.json();
    const filtered = threads.filter(t => t.board === boardSelect.value);
    displayThreads(filtered);
  } catch (e) { console.error(e); }
}

function displayThreads(threads){
  threadsContainer.innerHTML="";
  if(threads.length===0) return threadsContainer.innerHTML="<p>スレッドがありません</p>";

  threads.forEach(thread=>{
    const card = document.createElement("div");
    card.className="thread-card";
    card.addEventListener("click",()=>location.href=`/board.html?id=${thread._id}`);

    const title = document.createElement("div");
    title.className="thread-title";
    title.textContent=`[${thread.board}] ${thread.title}`;

    const info = document.createElement("div");
    info.className="thread-info";
    info.textContent=`最終投稿日:${new Date(thread.latestPostDate||thread.createdAt).toLocaleString()} | レス数:${thread.repliesCount} | 投票:${thread.votes}`;

    const voteUp=document.createElement("button");
    voteUp.textContent="⬆️";
    voteUp.onclick=async e=>{
      e.stopPropagation();
      const res=await fetch(`/api/threads/${thread._id}/vote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"up"})});
      const data=await res.json();
      info.textContent=`最終投稿日:${new Date(thread.latestPostDate||thread.createdAt).toLocaleString()} | レス数:${thread.repliesCount} | 投票:${data.votes}`;
    };

    const voteDown=document.createElement("button");
    voteDown.textContent="⬇️";
    voteDown.onclick=async e=>{
      e.stopPropagation();
      const res=await fetch(`/api/threads/${thread._id}/vote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"down"})});
      const data=await res.json();
      info.textContent=`最終投稿日:${new Date(thread.latestPostDate||thread.createdAt).toLocaleString()} | レス数:${thread.repliesCount} | 投票:${data.votes}`;
    };

    card.append(title,info,voteUp,voteDown);
    threadsContainer.appendChild(card);
  });
}

newThreadBtn.addEventListener("click",async ()=>{
  const title=prompt("新しいスレッド名を入力(20文字以内)");
  if(!title) return;
  const res=await fetch("/api/threads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,board:boardSelect.value})});
  const thread=await res.json();
  location.href=`/board.html?id=${thread._id}`;
});

boardSelect.addEventListener("change",fetchThreads);
fetchThreads();
