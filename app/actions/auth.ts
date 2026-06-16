'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login(prevState: { error?: string } | null, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function getCurrentUser() {
  const supabase = createClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return {
      email: user.email || '',
      name: user.user_metadata?.name || 'Admin Dashboard',
    };
  } catch (e) {
    console.error('Failed to get current user:', e);
    return null;
  }
}

export async function updateAccountDetails(name: string, password?: string) {
  const supabase = createClient();
  try {
    const updateData: { data?: { name: string }; password?: string } = {};
    if (name) {
      updateData.data = { name };
    }
    if (password && password.trim().length > 0) {
      updateData.password = password;
    }
    
    const { error } = await supabase.auth.updateUser(updateData);
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (e) {
    const err = e as Error;
    console.error('Failed to update account:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

