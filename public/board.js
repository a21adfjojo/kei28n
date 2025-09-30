const urlParams = new URLSearchParams(window.location.search);
const threadId = urlParams.get("id");

const threadTitleElem = document.getElementById("thread-title");
const postsContainer = document.getElementById("posts");
const postForm = document.getElementById("post-form");
const backBtn = document.getElementById("back-btn");

if(!threadId){
  alert("スレッドIDが指定されていません");
  location.href="/";
}

// 投稿取得
async function fetchThreadAndPosts(){
  try{
    const res = await fetch(`/api/threads/${threadId}/posts`);
    if(!res.ok) throw new Error("スレッド取得に失敗しました");
    const data = await res.json();
    threadTitleElem.textContent = `[${data.thread.board}] ${data.thread.title}`;
    displayPosts(data.posts);
  }catch(e){
    alert(e.message);
    location.href="/";
  }
}

// 投稿表示
function displayPosts(posts){
  postsContainer.innerHTML="";
  if(posts.length===0){
    postsContainer.innerHTML="<p>まだ投稿はありません。</p>";
    return;
  }
  posts.forEach(post=>{
    const postDiv=document.createElement("div");
    postDiv.className="post";

    const header=document.createElement("div");
    header.className="post-header";
    header.textContent=post.name||"名無しさん";

    const date=document.createElement("span");
    date.className="post-date";
    date.textContent=new Date(post.createdAt).toLocaleString();
    header.appendChild(date);

    const content=document.createElement("div");
    content.className="post-content";
    content.textContent=post.content;

    postDiv.append(header,content);

    if(post.image){
      const img=document.createElement("img");
      img.src=post.image; // Base64
      img.alt="投稿画像";
      postDiv.appendChild(img);
    }

    const likeBtn=document.createElement("button");
    likeBtn.textContent=`👍 ${post.likes||0}`;
    likeBtn.onclick=async ()=>{
      post.likes++;
      likeBtn.textContent=`👍 ${post.likes}`;
    };
    postDiv.appendChild(likeBtn);

    postsContainer.appendChild(postDiv);
  });
}

// 投稿送信
postForm.addEventListener("submit", async(e)=>{
  e.preventDefault();
  const formData=new FormData();
  formData.append("name", postForm.name.value.trim());
  formData.append("content", postForm.content.value.trim());
  if(postForm.image.files[0]) formData.append("image", postForm.image.files[0]);

  try{
    const res=await fetch(`/api/threads/${threadId}/posts`,{
      method:"POST",
      body:formData
    });
    if(!res.ok){
      const err=await res.json();
      throw new Error(err.error||"投稿に失敗しました");
    }
    postForm.content.value="";
    postForm.image.value="";
    fetchThreadAndPosts();
  }catch(e){ alert(e.message); }
});

backBtn.addEventListener("click",()=>{ location.href="/"; });

fetchThreadAndPosts();
