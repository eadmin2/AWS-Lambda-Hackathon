/*
  # Update specific user to admin role

  1. Changes
    - Updates the specified user's role to 'admin' in the profiles table
*/

UPDATE profiles 
SET role = 'admin'
WHERE id = '578bb95f-a443-42e1-ad99-73b930f46d55';