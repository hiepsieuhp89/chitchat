# ChitChat - Real-time Chat Application

A modern real-time chat application with role-based permissions.

## Features

- Real-time messaging
- File sharing and media attachments
- Message editing, deletion, and recall
- Role-based permissions
- Online status indicators
- Read receipts
- Rich text editor
- Audio recording
- Emoji picker
- Dark/Light mode

## Role-Based System

The application now has a role-based permission system:

### Admin Users
- Can edit any of their own messages
- See the "(edited)" label on edited messages
- Can see and chat with all regular users
- Full access to all features

### Regular Users
- Cannot edit messages
- Don't see the "(edited)" label on messages
- Can only see and chat with admin users
- Limited access to features

When a user first logs in, they will be prompted to choose their role. This choice determines what features and users they can access in the system.

## Technology

- React with Next.js
- Firebase (Authentication, Firestore)
- TypeScript
- Tailwind CSS
- Framer Motion for animations
- Various media APIs for audio recording and playback 