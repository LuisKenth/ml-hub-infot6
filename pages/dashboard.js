import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [articles, setArticles] = useState([]);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchArticles();

        // Notipikasyon sa email ng Admin na may nag-login
        try {
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: `Login Alert: ${data.user.email}`,
              message: `User ${data.user.email} has logged into the ML Hub on ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`,
            }),
          });
        } catch (e) {
          console.error("Login email failed", e);
        }
      }
    };
    checkUser();
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("likes", { ascending: false })
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching articles:", error);
    } else {
      setArticles(data || []);
    }
  };

  const deleteArticle = async (id, ownerId) => {
    if (user?.id !== ownerId) {
      return alert("You can only delete your own articles!");
    }
    if (!confirm("Are you sure you want to delete this article?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (!error) {
      fetchArticles();
    } else {
      alert("Error deleting article");
    }
  };

  const importFromUrl = async () => {
    if (!importUrl) return alert("Paste a link first!");
    setIsImporting(true);
    let cleanUrl = importUrl.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;
    
    try {
      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`);
      const result = await response.json();
      
      if (result.status === "success") {
        const data = result.data;
        const scrapedTitle = data.title || "Untitled Insight";
        const description = data.description || "No summary available.";
        const publisher = data.publisher || "Global Source";

        const structuredContent = `[OVERVIEW]\n${description}\n\n[KEY ANALYSIS]\nThis resource from ${publisher} provides valuable insights into current technology trends. The information presented is essential for developers and ML enthusiasts looking to stay updated.\n\n[CONCLUSION]\nTo get the full technical details and complete discussion, please refer to the original publication linked below.`;

        setTitle(scrapedTitle);
        setContent(structuredContent);
        setSourceUrl(cleanUrl);
        setImportUrl("");
        alert("Article generated successfully!");
      } else {
        throw new Error("Protected");
      }
    } catch (e) {
      const domain = new URL(cleanUrl).hostname.replace('www.', '');
      setTitle(`Resource from ${domain}`);
      setContent(`I've discovered an important update on ${domain}.\n\nThis specific platform has high security restrictions that prevent automatic text extraction. However, the information is highly relevant to our Machine Learning hub.\n\n[ACTION]\nPlease click the 'View Original Source' button below to read the full content.`);
      setSourceUrl(cleanUrl);
      setImportUrl("");
      alert("Site is highly protected. Generated a professional link fallback.");
    } finally { 
      setIsImporting(false); 
    }
  };

  const createArticle = async () => {
    if (!title || !content) return alert("Generate or write an article first!");

    const { error } = await supabase.from("articles").insert([
      { title, content, user_id: user?.id, likes: 0, source_url: sourceUrl },
    ]);

    if (!error) {
      setTitle(""); 
      setContent(""); 
      setSourceUrl(""); 
      fetchArticles();

      alert("Article published successfully!");

      try {
        const response = await fetch("/api/send-article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: `New Article Published: ${title}`,
            message: `User ${user?.email} has published a new article: "${title}".`,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          console.error("Email API Error:", errData);
        }
      } catch (e) {
        console.error("Failed to reach email API.", e);
      }
    } else {
      alert("Error saving article to database: " + error.message);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <nav style={styles.navbar}>
        <div style={styles.logo}>✦ ML <span style={{ color: "#0ea5e9" }}>HUB</span></div>
        <div style={styles.navUser}>
          <span style={styles.userEmail}>{user?.email}</span>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.mainLayout}>
        <aside style={styles.sidebar}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Article Generator</h3>
            <div style={styles.importGroup}>
              <input style={styles.importInput} placeholder="Paste link..." value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
              <button onClick={importFromUrl} style={styles.importBtn} disabled={isImporting}>{isImporting ? "..." : "Build"}</button>
            </div>
            <div style={styles.divider} />
            <input style={styles.inputTitle} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea style={styles.textarea} placeholder="Article content..." value={content} onChange={(e) => setContent(e.target.value)} />
            {sourceUrl && <div style={styles.sourceTag}>🔗 Source Ready</div>}
            <button onClick={createArticle} style={styles.primaryBtn}>Publish to Feed</button>
          </div>
        </aside>

        <main style={styles.feedSection}>
          <h2 style={styles.sectionTitle}>Dashboard Article</h2>
          {articles.map((a) => (
            <div key={a.id} style={styles.articleCard}>
              <div style={styles.cardBody}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.articleTitle}>{a.title}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <small style={{ color: "#64748b", fontSize: "0.75rem" }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString("en-PH") : ""}
                    </small>
                    {user && user.id === a.user_id && (
                      <button onClick={() => deleteArticle(a.id, a.user_id)} style={styles.deleteBtn}>🗑️</button>
                    )}
                  </div>
                </div>
                <p style={styles.articleContent}>{a.content}</p>
                <div style={styles.cardFooter}>
                  <div style={styles.footerLeft}>
                    {a.source_url && <a href={a.source_url} target="_blank" rel="noreferrer" style={styles.sourceLink}>View Original Source</a>}
                    <button onClick={() => { navigator.clipboard.writeText(`${baseUrl}/article/${a.id}`); alert("Link Copied!"); }} style={styles.actionBtn}>Share</button>
                  </div>
                  {/* Bagong LikeButton na may bagong design at logic */}
                  <LikeButton articleId={a.id} initialLikes={a.likes} user={user} onLikeToggled={fetchArticles} />
                </div>
              </div>
              <CommentSection articleId={a.id} user={user} />
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

function LikeButton({ articleId, initialLikes, user, onLikeToggled }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLikeStatus = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("likes")
        .select("id")
        .eq("article_id", articleId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setIsLiked(true);
      }
    };
    fetchLikeStatus();
  }, [articleId, user]);

  const handleLike = async () => {
    if (!user) {
      return alert("Mangyaring mag-log in upang i-like ang article na ito.");
    }
    if (loading) return;
    setLoading(true);

    try {
      if (isLiked) {
        // Dislike / Un-heart
        const { error: deleteError } = await supabase
          .from("likes")
          .delete()
          .eq("article_id", articleId)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        const newCount = Math.max(0, likesCount - 1);
        
        const { error: updateError } = await supabase
          .from("articles")
          .update({ likes: newCount })
          .eq("id", articleId);

        if (updateError) throw updateError;

        setLikesCount(newCount);
        setIsLiked(false);
      } else {
        // Like / Heart
        const { error: insertError } = await supabase
          .from("likes")
          .insert([{ article_id: articleId, user_id: user.id }]);

        if (insertError) throw insertError;

        const newCount = likesCount + 1;
        
        const { error: updateError } = await supabase
          .from("articles")
          .update({ likes: newCount })
          .eq("id", articleId);

        if (updateError) throw updateError;

        setLikesCount(newCount);
        setIsLiked(true);
      }

      if (onLikeToggled) {
        onLikeToggled(); // Ire-refresh at i-o-order ang listahan pataas
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      alert("May naganap na error. Subukan muli.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLike} 
      disabled={loading}
      style={{
        ...styles.heartBtn, 
        background: isLiked ? "#ffe4e6" : "#ffffff",
        borderColor: isLiked ? "#e11d48" : "#cbd5e1",
        color: isLiked ? "#e11d48" : "#475569",
        boxShadow: isLiked ? "0 2px 8px rgba(225, 29, 72, 0.12)" : "none",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s ease-in-out"
      }}
    >
      {isLiked ? "❤️" : "🤍"} {likesCount}
    </button>
  );
}

function CommentSection({ articleId, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  
  useEffect(() => { fetchComments(); }, []);
  
  const fetchComments = async () => {
    const { data } = await supabase.from("comments").select("*").eq("article_id", articleId).order("created_at", { ascending: true });
    setComments(data || []);
  };
  
  const addComment = async () => {
    if (!text) return;
    await supabase.from("comments").insert([{ article_id: articleId, text }]);
    setText(""); 
    fetchComments();
  };
  
  return (
    <div style={styles.commentBox}>
      <div style={styles.commentInputRow}>
        <input style={styles.miniInput} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment..." />
        <button onClick={addComment} style={styles.miniBtn}>Post</button>
      </div>
      {comments.map((c) => <ReplySection key={c.id} comment={c} user={user} />)}
    </div>
  );
}

function ReplySection({ comment, user }) {
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState("");
  const [showInput, setShowInput] = useState(false);
  
  useEffect(() => { fetchReplies(); }, []);
  
  const fetchReplies = async () => {
    const { data } = await supabase.from("replies").select("*").eq("comment_id", comment.id).order("created_at", { ascending: true });
    setReplies(data || []);
  };
  
  const addReply = async () => {
    if (!text) return;
    await supabase.from("replies").insert([{ comment_id: comment.id, text }]);
    setText(""); 
    setShowInput(false); 
    fetchReplies();
  };
  
  return (
    <div style={styles.replyContainer}>
      <div style={styles.mainComment}>
        <p style={styles.commentText}>{comment.text}</p>
        <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px" }}>
          {comment.created_at ? new Date(comment.created_at).toLocaleString("en-PH") : "Just now"}
        </span>
        <button onClick={() => setShowInput(!showInput)} style={styles.replyLink}>Reply</button>
      </div>
      {replies.map((r) => (
        <div key={r.id} style={styles.replyItem}>
          ↳ {r.text} 
          <span style={{ fontSize: "0.70rem", color: "#64748b", marginLeft: "6px" }}>
            {r.created_at ? new Date(r.created_at).toLocaleString("en-PH") : "Just now"}
          </span>
        </div>
      ))}
      {showInput && (
        <div style={styles.replyInputArea}>
          <input style={styles.miniInput} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply..." />
          <button onClick={addReply} style={styles.replyBtn}>Post</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageWrapper: { minHeight: "100vh", backgroundColor: "#f0f9ff", fontFamily: "'Inter', sans-serif", color: "#1e293b" },
  navbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 40px", height: "68px", backgroundColor: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid #bae6fd", position: "sticky", top: 0, zIndex: 100 },
  logo: { fontWeight: "800", fontSize: "1.25rem" },
  navUser: { display: "flex", alignItems: "center", gap: "15px" },
  userEmail: { fontSize: "0.8rem", color: "#475569" },
  logoutBtn: { padding: "6px 14px", borderRadius: "20px", border: "1px solid #bae6fd", background: "#ffffff", color: "#0369a1", cursor: "pointer", fontSize: "0.78rem", fontWeight: "600", transition: "0.2s" },
  mainLayout: { display: "grid", gridTemplateColumns: "360px 1fr", gap: "40px", maxWidth: "1280px", margin: "40px auto", padding: "0 24px" },
  sidebar: { position: "sticky", top: "100px", height: "fit-content" },
  card: { background: "#ffffff", padding: "28px", borderRadius: "16px", border: "1px solid #e0f2fe", boxShadow: "0 10px 25px -5px rgba(14, 165, 233, 0.08)" },
  cardTitle: { marginTop: 0, fontSize: "1.05rem", fontWeight: "700", marginBottom: "18px", color: "#0c4a6e" },
  importGroup: { display: "flex", gap: "10px", marginBottom: "18px" },
  importInput: { flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none", backgroundColor: "#f8fafc", color: "#0f172a" },
  importBtn: { background: "#0ea5e9", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0 16px", cursor: "pointer", fontWeight: "600", transition: "0.2s" },
  divider: { height: "1px", background: "#e2e8f0", margin: "18px 0" },
  inputTitle: { width: "100%", padding: "12px 0", border: "none", borderBottom: "1px solid #cbd5e1", outline: "none", fontWeight: "700", marginBottom: "12px", fontSize: "1.15rem", backgroundColor: "transparent", color: "#0f172a" },
  textarea: { width: "100%", minHeight: "240px", border: "none", outline: "none", fontSize: "0.9rem", resize: "none", color: "#334155", lineHeight: "1.7", backgroundColor: "transparent" },
  sourceTag: { fontSize: "0.68rem", color: "#0369a1", background: "#e0f2fe", padding: "4px 10px", borderRadius: "20px", display: "inline-block", marginBottom: "12px" },
  primaryBtn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "#ffffff", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 16px rgba(14, 165, 233, 0.25)", transition: "0.2s" },
  feedSection: { display: "flex", flexDirection: "column", gap: "24px" },
  sectionTitle: { fontSize: "1.45rem", fontWeight: "800", margin: "0 0 12px 0", color: "#0c4a6e", letterSpacing: "-0.5px" },
  articleCard: { background: "#ffffff", borderRadius: "16px", border: "1px solid #e0f2fe", overflow: "hidden", boxShadow: "0 10px 25px -5px rgba(14, 165, 233, 0.08)" },
  cardBody: { padding: "28px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  articleTitle: { margin: 0, fontSize: "1.35rem", fontWeight: "700", color: "#0c4a6e" },
  deleteBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: "1.15rem", transition: "0.2s" },
  articleContent: { fontSize: "0.95rem", color: "#334155", lineHeight: "1.8", whiteSpace: "pre-wrap" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #e2e8f0" },
  footerLeft: { display: "flex", gap: "20px", alignItems: "center" },
  sourceLink: { color: "#0284c7", fontSize: "0.85rem", fontWeight: "700", textDecoration: "none" },
  actionBtn: { background: "none", border: "none", color: "#64748b", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600", transition: "0.2s" },
  heartBtn: { border: "1px solid #cbd5e1", padding: "8px 20px", borderRadius: "24px", cursor: "pointer", fontWeight: "700", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px", transition: "0.2s" },
  commentBox: { background: "#f8fafc", padding: "20px 28px", borderTop: "1px solid #f1f5f9" },
  commentInputRow: { display: "flex", gap: "10px", marginBottom: "16px" },
  miniInput: { flex: 1, padding: "9px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#ffffff", color: "#0f172a" },
  miniBtn: { background: "#0ea5e9", color: "#ffffff", border: "none", padding: "0 16px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" },
  replyContainer: { marginBottom: "16px", paddingLeft: "12px", borderLeft: "2px solid #bae6fd" },
  commentText: { fontSize: "0.88rem", margin: "0 0 4px 0", fontWeight: "500", color: "#1e293b" },
  replyLink: { background: "none", border: "none", color: "#64748b", fontSize: "0.74rem", fontWeight: "700", cursor: "pointer", padding: 0 },
  replyItem: { fontSize: "0.85rem", color: "#475569", margin: "6px 0 0 16px" },
  replyInputArea: { display: "flex", gap: "8px", marginTop: "10px", marginLeft: "16px" },
  replyBtn: { background: "#ffffff", color: "#0ea5e9", border: "1px solid #bae6fd", padding: "4px 10px", borderRadius: "6px", fontSize: "0.74rem", cursor: "pointer" }
};