'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { postsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { PostWithAuthor, CommentWithAuthor } from '@/types/database';

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Helper function to get full name from author object
  const getAuthorName = (author: { first_name?: string; last_name?: string } | null | undefined) => {
    if (!author) return 'Unknown';
    return `${author.first_name || ''} ${author.last_name || ''}`.trim() || 'Unknown';
  };

  // Helper function to get author initials
  const getAuthorInitials = (author: { first_name?: string; last_name?: string } | null | undefined) => {
    if (!author) return '?';
    const firstInitial = author.first_name ? author.first_name.charAt(0) : '?';
    const lastInitial = author.last_name ? author.last_name.charAt(0) : '';
    return (firstInitial + lastInitial).toUpperCase() || '?';
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      fetchPostAndComments();
    }
  }, [id, user, authLoading, router]);

  const fetchPostAndComments = async () => {
    try {
      setIsLoading(true);
      
      // Fetch post with author info
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          author:members(id, first_name, last_name, profile_image_url)
        `)
        .eq('id', id)
        .single();
      
      if (postError) throw postError;
      
      if (!postData) {
        throw new Error('Post not found');
      }
      
      setPost(postData as PostWithAuthor);
      
      // Fetch comments
      const commentsData = await postsApi.getComments(id);
      
      setComments(commentsData as CommentWithAuthor[] || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Failed to load post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post || !user) return;
    try {
      // Optimistically update the UI
      setPost({
        ...post,
        likes_count: post.likes_count + 1
      });
      // Update in the database
      const { error } = await postsApi.likePost(post.id, post.likes_count + 1, user.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error liking post:', err);
      // Revert optimistic update
      if (post) {
        setPost({
          ...post,
          likes_count: post.likes_count - 1
        });
      }
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !user) return;
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      // Add the comment
      await postsApi.addComment({
        post_id: post.id,
        author_id: user.id,
        content: newComment
      }, user.id);
      // Refresh post and comments
      fetchPostAndComments();
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Post Not Found</h2>
          <p className="text-gray-600 mb-6">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Link 
            href="/feed" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {post.title}
            </h1>
            <Link 
              href="/feed" 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Back to Feed
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-md">
              {error}
            </div>
          )}
          
          {/* Post Card */}
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden mb-8">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm overflow-hidden">
                  {post.author?.profile_image_url ? (
                    <img 
                      src={post.author.profile_image_url} 
                      alt={`${getAuthorName(post.author)}'s profile`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // If image fails to load, display initials instead
                        (e.target as HTMLImageElement).style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = getAuthorInitials(post.author);
                      }}
                    />
                  ) : (
                    <span>{getAuthorInitials(post.author)}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {getAuthorName(post.author)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
                {post.is_pinned && (
                  <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pinned
                  </span>
                )}
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>
              
              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
              </div>
              
              {post.image_url && (
                <div className="mb-6">
                  <img 
                    src={post.image_url} 
                    alt={post.title}
                    className="rounded-lg max-h-96 w-auto mx-auto"
                    onError={(e) => {
                      // Hide the image if it fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-4">
                  <button 
                    onClick={handleLike}
                    className="flex items-center text-sm text-gray-500 hover:text-blue-600"
                  >
                    <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span>{post.likes_count}</span>
                  </button>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{post.comments_count}</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  {new Date(post.updated_at).getTime() > new Date(post.created_at).getTime() && (
                    <span>Edited {new Date(post.updated_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Comments ({post.comments_count})
              </h2>
            </div>
            
            {/* Comment Form */}
            <div className="p-6 border-b border-gray-200">
              <form onSubmit={handleSubmitComment}>
                <div className="mb-4">
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Add a comment
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write your comment here..."
                    required
                  ></textarea>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSubmitting || !newComment.trim() ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Comments List */}
            <div className="divide-y divide-gray-200">
              {comments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-6">
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs overflow-hidden flex-shrink-0">
                        {comment.author?.profile_image_url ? (
                          <img 
                            src={comment.author.profile_image_url} 
                            alt={`${getAuthorName(comment.author)}'s profile`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // If image fails to load, display initials instead
                              (e.target as HTMLImageElement).style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = getAuthorInitials(comment.author);
                            }}
                          />
                        ) : (
                          <span>{getAuthorInitials(comment.author)}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {getAuthorName(comment.author)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 