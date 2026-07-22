import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import { AdminHeaderPill, AdminHeaderMenu, useAdminHeaderPill } from '../../layout/AdminHeaderUserPill';
import { PortalLayout } from '../../layout/PortalLayout';
import { getServiceProvider } from '../../data/dhlMockData';
import {
  loadCompanyPosts,
  saveCompanyPosts,
  getDhlPosts,
  assetPath,
  type SopPost,
} from '../../data/sopFeedData';
import '../../styles/legacy/sop-feed.css';

type FeedTab = 'all' | 'drivers' | 'company' | 'dhl';

const TYPE_LABELS: Record<string, string> = { tutorial: 'Tutorial', update: 'Update', info: 'Info' };

function typeLabel(type: string): string {
  return TYPE_LABELS[type] || 'Info';
}

function sourceLabel(post: SopPost): string {
  if (post.source === 'dhl') return 'DHL';
  return post.sharedFromDhlId ? 'Shared from DHL' : 'Company';
}

function audienceLabel(post: SopPost): string {
  return post.audience === 'drivers' ? 'Drivers' : 'Company';
}

function previewContent(content: string): string {
  return content.length > 90 ? `${content.substring(0, 90)}…` : content;
}

function PostPreviewMedia({ post }: { post: SopPost }) {
  if (post.youtubeVideoId) {
    const thumbUrl = `https://img.youtube.com/vi/${post.youtubeVideoId}/hqdefault.jpg`;
    return (
      <div className="sop-post-preview-media">
        <span className="sop-post-preview-thumb sop-post-preview-thumb--video" style={{ backgroundImage: `url('${thumbUrl}')` }}>
          <i className="bi bi-play-fill" />
        </span>
      </div>
    );
  }
  if (post.video) {
    return (
      <div className="sop-post-preview-media">
        <span className="sop-post-preview-thumb sop-post-preview-thumb--video">
          <i className="bi bi-play-fill" />
        </span>
      </div>
    );
  }
  if (post.image) {
    return (
      <div className="sop-post-preview-media">
        <span className="sop-post-preview-thumb sop-post-preview-thumb--image" style={{ backgroundImage: `url('${assetPath(post.image)}')` }} />
      </div>
    );
  }
  return null;
}

function PostMedia({ post }: { post: SopPost }) {
  if (post.youtubeVideoId) {
    const vid = post.youtubeVideoId;
    return (
      <a
        href={`https://www.youtube.com/watch?v=${vid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="sop-post-media sop-post-media--youtube sop-youtube-link"
        title="Watch on YouTube"
      >
        <span className="sop-youtube-thumb" style={{ backgroundImage: `url('https://img.youtube.com/vi/${vid}/hqdefault.jpg')` }} />
        <span className="sop-youtube-play">
          <i className="bi bi-play-circle-fill" />
        </span>
        <span className="sop-youtube-label">Watch on YouTube</span>
      </a>
    );
  }
  if (post.video) {
    return (
      <div className="sop-post-media sop-post-media--video">
        <video controls preload="metadata">
          <source src={assetPath(post.video)} type="video/mp4" />
        </video>
      </div>
    );
  }
  if (post.image) {
    return (
      <div className="sop-post-media sop-post-media--image">
        <img src={assetPath(post.image)} alt="" />
      </div>
    );
  }
  return null;
}

export function SOPFeed() {
  useViewportAttribute();
  const sp = useCurrentSp();
  const menuControls = useAdminHeaderPill();

  const [posts, setPosts] = useState<SopPost[]>(() => [...loadCompanyPosts(), ...getDhlPosts()]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [openPostId, setOpenPostId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAudience, setFormAudience] = useState<'drivers' | 'company'>('drivers');
  const [formDhlSource, setFormDhlSource] = useState('');

  const dhlPosts = useMemo(() => posts.filter((p) => p.source === 'dhl'), [posts]);

  const q = search.toLowerCase().trim();
  const visiblePosts = posts.filter((p) => {
    if (activeTab === 'drivers' && p.audience !== 'drivers') return false;
    if (activeTab === 'company' && p.audience !== 'company') return false;
    if (activeTab === 'dhl' && p.source !== 'dhl') return false;
    if (!q) return true;
    const haystack = `${p.title} ${p.content} ${p.type} ${p.author} ${p.audience}`.toLowerCase();
    return haystack.includes(q);
  });

  const openPost = posts.find((p) => p.id === openPostId) || null;

  function handlePublish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = formTitle.trim();
    const content = formContent.trim();
    const selectedDhlId = formDhlSource ? parseInt(formDhlSource, 10) : null;
    const selectedDhlPost = selectedDhlId != null ? dhlPosts.find((p) => p.id === selectedDhlId) || null : null;
    if (!title && !content && !selectedDhlPost) return;

    const newPost: SopPost = {
      id: Date.now(),
      author: 'Service Provider Admin',
      authorAvatar: 'assets/atlas-transport-logo.png',
      timeAgo: 'Just now',
      type: 'update',
      title: title || (selectedDhlPost ? selectedDhlPost.title : 'Company update'),
      content: content || (selectedDhlPost ? selectedDhlPost.content : 'Please review this important update.'),
      video: null,
      image: null,
      youtubeVideoId: null,
      likes: 0,
      comments: 0,
      liked: false,
      commentList: [],
      source: 'company',
      audience: formAudience,
      sharedFromDhlId: selectedDhlPost ? selectedDhlPost.id : null,
    };

    const next = [newPost, ...posts];
    setPosts(next);
    saveCompanyPosts(next);
    setFormTitle('');
    setFormContent('');
    setFormDhlSource('');
    setOpenPostId(newPost.id);
  }

  function closePost() {
    setOpenPostId(null);
    setCommentDraft('');
  }

  function toggleLike(id: number) {
    setPosts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (!p.liked ? 1 : -1) } : p));
      saveCompanyPosts(next);
      return next;
    });
  }

  function submitComment(e: React.FormEvent<HTMLFormElement>, id: number) {
    e.preventDefault();
    const text = commentDraft.trim();
    if (!text) return;
    const spInfo = getServiceProvider(sp);
    setPosts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const commentList = [
          ...p.commentList,
          { author: spInfo?.owner || 'User', company: sp || '—', authorAvatar: 'assets/atlas-transport-logo.png', text, timeAgo: 'Just now' },
        ];
        return { ...p, commentList, comments: commentList.length };
      });
      saveCompanyPosts(next);
      return next;
    });
    setCommentDraft('');
  }

  const header = (
    <>
      <div className="admin-header sop-header">
        <div className="sop-header-top">
          <h1 className="admin-header-title">
            <i className="bi bi-megaphone-fill" /> Announcements &amp; Feed
          </h1>
          <AdminHeaderPill sp={sp} controls={menuControls} />
        </div>
        <p className="text-muted small mb-2">Publish updates to your drivers and share DHL guidance directly in the company feed.</p>
        <div className="admin-header-search sop-header-search">
          <input
            type="search"
            id="sopSearch"
            className="form-control"
            placeholder="Search company updates, DHL posts, keywords…"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <AdminHeaderMenu sp={sp} controls={menuControls} />
    </>
  );

  return (
    <PortalLayout mainClassName="sop-main" header={header}>
      {/* Create post */}
      <form className="sop-create-post" id="companyPostForm" onSubmit={handlePublish}>
        <div className="sop-create-post-inner">
          <div className="d-flex align-items-start gap-3">
            <div className="sop-create-post-avatar">
              <img src="/assets/atlas-transport-logo.png" alt="" />
            </div>
            <div className="sop-create-post-input-wrap">
              <input
                type="text"
                id="companyPostTitle"
                className="sop-create-post-title-input"
                maxLength={90}
                placeholder="Post title for your drivers"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <textarea
                id="companyPostContent"
                className="sop-create-post-input"
                rows={3}
                maxLength={500}
                placeholder="Write an update, reminder or guideline for your team…"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
              />
              <div className="sop-create-post-type-row">
                <label className="sop-create-post-type-label" htmlFor="companyPostAudience">
                  Audience
                </label>
                <select
                  id="companyPostAudience"
                  className="sop-create-post-type-select"
                  value={formAudience}
                  onChange={(e) => setFormAudience(e.target.value as 'drivers' | 'company')}
                >
                  <option value="drivers">Drivers</option>
                  <option value="company">Company team</option>
                </select>
                <label className="sop-create-post-type-label" htmlFor="companyPostDhlSource">
                  Share DHL post
                </label>
                <select
                  id="companyPostDhlSource"
                  className="sop-create-post-type-select"
                  value={formDhlSource}
                  onChange={(e) => setFormDhlSource(e.target.value)}
                >
                  <option value="">No DHL post selected</option>
                  {dhlPosts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || 'DHL update'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sop-create-post-actions">
                <span className="sop-create-post-hint">Your message will appear in the company feed for the selected audience.</span>
                <button type="submit" className="sop-create-action-btn sop-post-btn">
                  Publish update
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Feed tabs */}
      <div className="sop-feed-toolbar">
        <div className="sop-feed-tabs" role="tablist" aria-label="Feed filters">
          {(
            [
              ['all', 'All updates'],
              ['drivers', 'Drivers'],
              ['company', 'Company'],
              ['dhl', 'DHL'],
            ] as [FeedTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`sop-feed-tab${activeTab === key ? ' active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed posts */}
      <div className="sop-feed" id="sopFeed">
        {visiblePosts.map((p) => (
          <article
            key={p.id}
            className="sop-post sop-post--preview"
            role="button"
            tabIndex={0}
            onClick={() => setOpenPostId(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenPostId(p.id);
              }
            }}
          >
            <div className="sop-post-header">
              <div className="sop-post-avatar">
                <img src={assetPath(p.authorAvatar)} alt="" width={40} height={40} />
              </div>
              <div className="sop-post-meta">
                <strong className="sop-post-author">{p.author}</strong>
                <span className={`sop-post-badge sop-post-badge--${p.type}`}>{typeLabel(p.type)}</span>
                <span className="sop-post-badge sop-post-badge--source">{sourceLabel(p)}</span>
                <span className="sop-post-badge sop-post-badge--audience">{audienceLabel(p)}</span>
                <span className="sop-post-time">{p.timeAgo}</span>
              </div>
            </div>
            <div className="sop-post-body">
              {p.title && <h3 className="sop-post-title">{p.title}</h3>}
              <p className="sop-post-content sop-post-content--preview">{previewContent(p.content)}</p>
              <PostPreviewMedia post={p} />
            </div>
            <span className="sop-post-preview-cta">View post</span>
          </article>
        ))}
      </div>

      {createPortal(
        <div className={`sop-post-detail${openPost ? ' sop-post-detail--open' : ''}`} id="sopPostDetail" aria-hidden={!openPost}>
          <div className="sop-post-detail-backdrop" id="sopPostDetailBackdrop" onClick={closePost} />
          <div className="sop-post-detail-inner" id="sopPostDetailContent">
            {!openPost ? (
              <p className="sop-post-detail-placeholder" id="sopPostDetailPlaceholder">
                Click a post to open it
              </p>
            ) : (
              <article className="sop-post sop-post--detail" data-id={openPost.id}>
                <div className="sop-post-header">
                  <div className="sop-post-avatar">
                    <img src={assetPath(openPost.authorAvatar)} alt="" width={40} height={40} />
                  </div>
                  <div className="sop-post-meta">
                    <strong className="sop-post-author">{openPost.author}</strong>
                    <span className={`sop-post-badge sop-post-badge--${openPost.type}`}>{typeLabel(openPost.type)}</span>
                    <span className="sop-post-badge sop-post-badge--source">{sourceLabel(openPost)}</span>
                    <span className="sop-post-badge sop-post-badge--audience">{audienceLabel(openPost)}</span>
                    <span className="sop-post-time">{openPost.timeAgo}</span>
                  </div>
                </div>
                <div className="sop-post-body">
                  {openPost.title && <h3 className="sop-post-title">{openPost.title}</h3>}
                  <p className="sop-post-content">{openPost.content}</p>
                  <PostMedia post={openPost} />
                </div>
                <div className="sop-post-actions">
                  <button
                    type="button"
                    className={openPost.liked ? 'sop-action-btn sop-action-btn--active' : 'sop-action-btn'}
                    onClick={() => toggleLike(openPost.id)}
                  >
                    <i className={`bi bi-${openPost.liked ? 'heart-fill' : 'heart'}`} />
                    <span>{openPost.liked ? 'Liked' : 'Like'}</span>
                    {openPost.likes > 0 && <span className="sop-action-count">{openPost.likes}</span>}
                  </button>
                  <button type="button" className="sop-action-btn">
                    <i className="bi bi-chat" />
                    <span>Comment</span>
                    {openPost.comments > 0 && <span className="sop-action-count">{openPost.comments}</span>}
                  </button>
                </div>
                <div className="sop-comments">
                  <h4 className="sop-comments-title">Comments</h4>
                  <div className="sop-comments-list">
                    {openPost.commentList.map((c, i) => (
                      <div className="sop-comment" key={i}>
                        <div className="sop-comment-avatar">
                          <img src={assetPath(c.authorAvatar)} alt="" width={32} height={32} />
                        </div>
                        <div className="sop-comment-body">
                          <strong className="sop-comment-author">{c.company ? `${c.author} (${c.company})` : c.author}</strong>{' '}
                          <span className="sop-comment-time">{c.timeAgo}</span>
                          <p className="sop-comment-text">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form className="sop-comments-form" onSubmit={(e) => submitComment(e, openPost.id)}>
                    <div className="sop-comments-input-wrap">
                      <img src="/assets/atlas-transport-logo.png" alt="" className="sop-comment-input-avatar" width={32} height={32} />
                      <input
                        type="text"
                        className="sop-comments-input"
                        placeholder="Write a comment..."
                        maxLength={500}
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="sop-comments-submit">
                      Comment
                    </button>
                  </form>
                </div>
              </article>
            )}
          </div>
          <button
            type="button"
            className="sop-post-detail-close"
            aria-label="Close"
            onClick={closePost}
            style={{ display: openPost ? 'flex' : 'none' }}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>,
        document.body,
      )}
    </PortalLayout>
  );
}
