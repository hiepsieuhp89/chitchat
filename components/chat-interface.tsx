"use client";

import EmojiPicker from "@/components/emoji-picker";
import MessageItem from "@/components/message-item";
import RichTextEditor from "@/components/rich-text-editor";
import SettingsPanel from "@/components/settings-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { uploadToImageKit } from "@/lib/imagekit";
import { uploadToImgur } from "@/lib/imgur";
import type { Chat } from "@/types/chat";
import type { Attachment, Message } from "@/types/message";
import type { User } from "@/types/user";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  File,
  ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  Pause,
  Play,
  Send,
  Settings,
  Smile,
  Video,
  X,
  XCircle,
  GamepadIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createEmptyBoard } from "@/lib/tictactoe";

interface ChatInterfaceProps {
  selectedChat: Chat | null;
  selectedUser: User | null;
  setSelectedChat: (chat: Chat | null) => void;
  isMobile?: boolean;
  onBackToList?: () => void;
}

interface UploadingAttachment extends Attachment {
  isUploading: boolean;
  progress: number;
  localUrl?: string;
}

export default function ChatInterface({
  selectedChat,
  selectedUser,
  setSelectedChat,
  isMobile = false,
  onBackToList,
}: ChatInterfaceProps) {
  const { user, userRole } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [richText, setRichText] = useState("");
  const [isUsingRichText, setIsUsingRichText] = useState(false);
  const [attachments, setAttachments] = useState<UploadingAttachment[]>([]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioNotificationRef = useRef<HTMLAudioElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const initialRenderRef = useRef(true);

  // Check if user is admin
  const isAdmin = userRole === "admin";

  // Function to scroll to bottom - defined with useCallback to avoid recreation on every render
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setHasScrolledToBottom(true);
    }
  }, []);

  // Create a chat if selectedUser is set
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (selectedUser && user) {
      // Check if chat already exists
      const chatsRef = collection(db, "chats");
      const q = query(
        chatsRef,
        where("participants", "array-contains", user.uid)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const existingChat = snapshot.docs.find((doc) => {
          const chatData = doc.data();
          return chatData.participants.includes(selectedUser.uid);
        });

        if (existingChat) {
          setSelectedChat({
            id: existingChat.id,
            ...existingChat.data(),
          } as Chat);
          return;
        }

        // Create a new chat
        const createNewChat = async () => {
          try {
            const newChatRef = doc(collection(db, "chats"));
            const newChat = {
              participants: [user.uid, selectedUser.uid],
              participantsInfo: {
                [user.uid]: {
                  displayName: user.displayName || "Unknown",
                  photoURL: user.photoURL || "",
                },
                [selectedUser.uid]: {
                  displayName: selectedUser.displayName || "Unknown",
                  photoURL: selectedUser.photoURL || "",
                },
              },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            await setDoc(newChatRef, newChat);

            // Get the created chat
            const chatSnapshot = await getDoc(newChatRef);
            if (chatSnapshot.exists()) {
              const createdChat = {
                id: chatSnapshot.id,
                ...chatSnapshot.data(),
              } as Chat;
              setSelectedChat(createdChat);
            }
          } catch (error) {
            console.error("Error creating chat:", error);
          }
        };

        createNewChat();
      });
    }

    return () => unsubscribe();
  }, [selectedUser, user, setSelectedChat]);

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    // Reset scroll state when changing chats
    setHasScrolledToBottom(false);
    setShouldScrollToBottom(true);

    // Immediately mark lastMessage as read when chat is selected
    if (
      user &&
      selectedChat.lastMessage &&
      selectedChat.lastMessage.sender !== user.uid &&
      !selectedChat.lastMessage.read
    ) {
      try {
        const chatRef = doc(db, "chats", selectedChat.id);
        updateDoc(chatRef, {
          "lastMessage.read": true,
        });
      } catch (error) {
        console.error("Error marking last message as read:", error);
      }
    }

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChat.id),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList: Message[] = [];
      snapshot.forEach((doc) => {
        messagesList.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(messagesList);

      // Play notification sound for new messages
      const lastMessage = messagesList[messagesList.length - 1];
      if (
        lastMessage &&
        user &&
        lastMessage.sender !== user.uid &&
        !lastMessage.readBy.includes(user.uid)
      ) {
        audioNotificationRef.current?.play();
      }

      // Mark messages as read
      if (user) {
        messagesList.forEach((message) => {
          if (
            message.sender !== user.uid &&
            !message.readBy.includes(user.uid)
          ) {
            const markAsRead = async () => {
              try {
                const messageRef = doc(db, "messages", message.id);
                await updateDoc(messageRef, {
                  readBy: [...message.readBy, user.uid],
                });

                // Update last message in chat if it's this message
                if (
                  selectedChat.lastMessage &&
                  selectedChat.lastMessage.timestamp?.isEqual?.(
                    message.timestamp
                  )
                ) {
                  const chatRef = doc(db, "chats", selectedChat.id);
                  await updateDoc(chatRef, {
                    "lastMessage.read": true,
                  });
                }
              } catch (error) {
                console.error("Error marking message as read:", error);
              }
            };
            markAsRead();
          }
        });
      }

      // Set flag to scroll to bottom with new messages
      setShouldScrollToBottom(true);
    });

    return () => unsubscribe();
  }, [selectedChat, user]);

  // Handle scrolling to bottom when messages change
  useEffect(() => {
    if (!shouldScrollToBottom) return;

    // Check if there are images in the messages
    const hasImages = messages.some((message) =>
      message.attachments?.some((attachment) => attachment.type === "image")
    );

    if (hasImages) {
      // If there are images, we need to wait for them to load
      const timer = setTimeout(() => {
        scrollToBottom();
        setShouldScrollToBottom(false);
      }, 500); // Adjust timeout as needed
      return () => clearTimeout(timer);
    } else {
      // If no images, scroll immediately
      scrollToBottom();
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom, scrollToBottom]);

  // Handle audio recording
  useEffect(() => {
    if (isRecording && !audioRecorder) {
      const startRecording = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const recorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
              setAudioChunks([...chunks]);
            }
          };

          recorder.start();
          setAudioRecorder(recorder);
        } catch (error) {
          console.error("Error starting audio recording:", error);
          setIsRecording(false);
          toast({
            title: "Recording Error",
            description:
              "Could not access microphone. Please check permissions.",
            variant: "destructive",
          });
        }
      };

      startRecording();
    } else if (!isRecording && audioRecorder) {
      audioRecorder.stop();

      // Clean up
      audioRecorder.stream.getTracks().forEach((track) => track.stop());
      setAudioRecorder(null);
    }
  }, [isRecording, audioRecorder]);

  // Create audio preview when recording stops
  useEffect(() => {
    // Only create a new preview URL if we have audio chunks and we're not recording
    if (audioChunks.length > 0 && !isRecording && !audioPreviewUrl) {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(audioBlob);
      setAudioPreviewUrl(url);
    }

    // Cleanup function
    return () => {
      // No cleanup needed here - we'll handle URL revocation separately
    };
  }, [audioChunks, isRecording, audioPreviewUrl]);

  // Clean up audio preview when component unmounts or when preview is cleared
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  // Handle initial render
  useEffect(() => {
    initialRenderRef.current = false;
  }, []);

  const handleSendMessage = async () => {
    if (
      (!messageText.trim() && !richText.trim() && attachments.length === 0) ||
      !selectedChat ||
      !user
    )
      return;

    try {
      // Filter out any attachments that are still uploading
      const readyAttachments = attachments
        .filter((att) => !att.isUploading)
        .map(({ isUploading, progress, localUrl, ...rest }) => rest);

      if (attachments.some((att) => att.isUploading)) {
        toast({
          title: "Uploads in progress",
          description:
            "Some attachments are still uploading. They will be added when ready.",
          variant: "default",
        });
      }

      // Create base message data
      const messageData: any = {
        chatId: selectedChat.id,
        sender: user.uid,
        status: "sent",
        readBy: [user.uid],
      };

      // Add text content based on mode
      if (isUsingRichText) {
        messageData.text = "";
        messageData.richText = richText;
      } else {
        messageData.text = messageText;
      }

      // Add attachments if any
      if (readyAttachments.length > 0) {
        messageData.attachments = readyAttachments;
      }

      const sanitizedAttachments = messageData.attachments?.map(
        (attachment: any) => {
          return Object.fromEntries(
            Object.entries(attachment).filter(([_, v]) => v !== undefined)
          );
        }
      );

      const sanitizedMessageData = {
        ...messageData,
        attachments: sanitizedAttachments ? sanitizedAttachments : [],
      };

      await addDoc(collection(db, "messages"), {
        ...sanitizedMessageData,
        timestamp: serverTimestamp(),
      });

      // Update last message in chat
      const chatRef = doc(db, "chats", selectedChat.id);
      await updateDoc(chatRef, {
        lastMessage: {
          text: isUsingRichText
            ? "Rich text message"
            : messageText ||
              (readyAttachments.length > 0
                ? `Sent ${readyAttachments.length} attachment(s)`
                : ""),
          sender: user.uid,
          timestamp: serverTimestamp(),
          read: false,
        },
        updatedAt: serverTimestamp(),
      });

      // Reset state
      setMessageText("");
      setRichText("");
      setAttachments([]);
      setIsUsingRichText(false);
      setIsEmojiPickerOpen(false);
      setAudioPreviewUrl(null);
      setAudioChunks([]);
      setShouldScrollToBottom(true);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !user || !selectedChat || !isAdmin) return;

    try {
      const messageRef = doc(db, "messages", editingMessage.id);

      // Determine the updated text content
      const updatedText = isUsingRichText ? "Rich text message" : messageText;

      await updateDoc(messageRef, {
        text: isUsingRichText ? "" : messageText,
        richText: isUsingRichText ? richText : null,
        edited: true,
        editedAt: serverTimestamp(),
      });

      // Check if this was the last message in the chat
      // If so, update the lastMessage in the chat document
      const chatRef = doc(db, "chats", selectedChat.id);
      const chatDoc = await getDoc(chatRef);

      if (chatDoc.exists()) {
        const chatData = chatDoc.data();

        // If the last message timestamp matches this message's timestamp, update it
        if (
          chatData.lastMessage &&
          chatData.lastMessage.timestamp &&
          editingMessage.timestamp
        ) {
          // Keep the original read status and sender
          const readStatus = chatData.lastMessage.read || false;
          await updateDoc(chatRef, {
            lastMessage: {
              text: updatedText,
              sender: editingMessage.sender,
              timestamp: editingMessage.timestamp,
              read: readStatus,
              edited: true,
            },
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Reset state
      setMessageText("");
      setRichText("");
      setEditingMessage(null);
      setIsUsingRichText(false);

      toast({
        title: "Message updated",
        description: "Your message has been edited successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error editing message:", error);
      toast({
        title: "Error",
        description: "Failed to edit message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setMessageText("");
    setRichText("");
    setEditingMessage(null);
    setIsUsingRichText(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user || !selectedChat) return;

    try {
      const messageRef = doc(db, "messages", messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        throw new Error("Message not found");
      }

      const messageData = messageDoc.data() as Message;

      await updateDoc(messageRef, {
        text: "This message was deleted",
        richText: null,
        attachments: [],
        status: "deleted",
      });

      // Check if this was the last message in the chat
      const chatRef = doc(db, "chats", selectedChat.id);
      const chatDoc = await getDoc(chatRef);

      if (chatDoc.exists()) {
        const chatData = chatDoc.data();

        // If the last message timestamp matches this message's timestamp, update it
        if (
          chatData.lastMessage &&
          chatData.lastMessage.timestamp &&
          messageData.timestamp &&
          chatData.lastMessage.timestamp.isEqual(messageData.timestamp)
        ) {
          // Keep the read status from the original message
          const readStatus = chatData.lastMessage.read || false;

          await updateDoc(chatRef, {
            lastMessage: {
              text: "This message was deleted",
              sender: messageData.sender,
              timestamp: messageData.timestamp,
              read: readStatus,
              status: "deleted",
            },
            updatedAt: serverTimestamp(),
          });
        }
      }

      toast({
        title: "Message deleted",
        description: "Your message has been deleted.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRecallMessage = async (messageId: string) => {
    if (!user || !selectedChat) return;

    try {
      const messageRef = doc(db, "messages", messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        throw new Error("Message not found");
      }

      const messageData = messageDoc.data() as Message;

      await updateDoc(messageRef, {
        text: "This message was recalled",
        richText: null,
        attachments: [],
        status: "recalled",
      });

      // Check if this was the last message in the chat
      const chatRef = doc(db, "chats", selectedChat.id);
      const chatDoc = await getDoc(chatRef);

      if (chatDoc.exists()) {
        const chatData = chatDoc.data();

        // If the last message timestamp matches this message's timestamp, update it
        if (
          chatData.lastMessage &&
          chatData.lastMessage.timestamp &&
          messageData.timestamp &&
          chatData.lastMessage.timestamp.isEqual(messageData.timestamp)
        ) {
          // Keep the read status from the original message
          const readStatus = chatData.lastMessage.read || false;

          await updateDoc(chatRef, {
            lastMessage: {
              text: "This message was recalled",
              sender: messageData.sender,
              timestamp: messageData.timestamp,
              read: readStatus,
              status: "recalled",
            },
            updatedAt: serverTimestamp(),
          });
        }
      }

      toast({
        title: "Message recalled",
        description: "Your message has been recalled.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error recalling message:", error);
      toast({
        title: "Error",
        description: "Failed to recall message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!user || !selectedChat) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = uuidv4();

      // Create a local URL for preview
      const localUrl = URL.createObjectURL(file);

      // Determine file type
      let type: "image" | "audio" | "file" | "sticker" | "video" = "file";
      if (file.type.startsWith("image/")) {
        type = "image";
      } else if (file.type.startsWith("audio/")) {
        type = "audio";
      } else if (file.type.startsWith("video/")) {
        type = "video";
      }

      // Add a temporary attachment with upload status
      const tempAttachment: UploadingAttachment = {
        type,
        url: localUrl,
        name: file.name,
        size: file.size,
        isUploading: true,
        progress: 0,
        localUrl,
      };

      setAttachments((prev) => [...prev, tempAttachment]);

      try {
        let url = "";

        if (type === "image") {
          // Use Imgur for images
          url = await uploadToImgur(file);
        } else {
          // Try ImageKit first, but it will fall back to Firebase if needed
          url = await uploadToImageKit(file);
        }

        // Get audio duration if needed
        let duration: number | undefined = undefined;
        if (type === "audio") {
          duration = await getAudioDuration(file);
        }

        // Update the attachment with the real URL
        setAttachments((prev) =>
          prev.map((att) =>
            att.localUrl === localUrl
              ? {
                  ...att,
                  url,
                  isUploading: false,
                  progress: 100,
                  duration,
                }
              : att
          )
        );

        // Revoke the object URL to free memory
        URL.revokeObjectURL(localUrl);
      } catch (error) {
        console.error("Error uploading file:", error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive",
        });

        // Update the attachment to show the error
        setAttachments((prev) =>
          prev.filter((att) => att.localUrl !== localUrl)
        );

        // Revoke the object URL to free memory
        URL.revokeObjectURL(localUrl);
      }
    }
  };

  const getAudioDuration = (blob: Blob | File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(blob);

      audio.addEventListener("loadedmetadata", () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      });

      audio.addEventListener("error", () => {
        resolve(0);
        URL.revokeObjectURL(audio.src);
      });
    });
  };

  const handleUploadAudioRecording = async () => {
    if (audioChunks.length === 0 || !selectedChat || !user) return;

    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const fileName = `recording_${new Date().getTime()}.webm`;
    const localUrl = audioPreviewUrl || URL.createObjectURL(audioBlob);

    // Get audio duration
    let duration = 0;
    if (audioPreviewRef.current) {
      duration = audioPreviewRef.current.duration;
    } else {
      duration = await getAudioDuration(audioBlob);
    }

    // Add a temporary attachment with upload status
    const tempAttachment: UploadingAttachment = {
      type: "audio",
      url: localUrl,
      name: fileName,
      size: audioBlob.size,
      isUploading: true,
      progress: 0,
      localUrl,
      duration,
    };

    setAttachments((prev) => [...prev, tempAttachment]);

    try {
      // Try ImageKit first, but it will fall back to Firebase if needed
      const url = await uploadToImageKit(audioBlob, fileName);

      // Update the attachment with the real URL
      setAttachments((prev) =>
        prev.map((att) =>
          att.localUrl === localUrl
            ? {
                ...att,
                url,
                isUploading: false,
                progress: 100,
              }
            : att
        )
      );

      // Reset audio state
      setAudioChunks([]);
      setAudioPreviewUrl(null);
      setIsAudioPlaying(false);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.currentTime = 0;
      }

      toast({
        title: "Audio uploaded",
        description: "Your audio recording has been uploaded successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error uploading audio recording:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload audio recording. Please try again.",
        variant: "destructive",
      });

      // Remove the failed attachment
      setAttachments((prev) => prev.filter((att) => att.localUrl !== localUrl));
    }
  };

  const handleAddEmoji = (emoji: string) => {
    if (isUsingRichText) {
      setRichText(richText + emoji);
    } else {
      setMessageText(messageText + emoji);
    }
    setIsEmojiPickerOpen(false);
  };

  const getOtherParticipantInfo = () => {
    if (!selectedChat || !user) return null;

    const otherParticipantId = selectedChat.participants.find(
      (id) => id !== user.uid
    );
    if (!otherParticipantId) return null;

    return selectedChat.participantsInfo[otherParticipantId];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const toggleAudioPlayback = () => {
    if (!audioPreviewRef.current || !audioPreviewUrl) return;

    if (isAudioPlaying) {
      audioPreviewRef.current.pause();
    } else {
      audioPreviewRef.current.play();
    }
    setIsAudioPlaying(!isAudioPlaying);
  };

  const handleAudioEnded = () => {
    setIsAudioPlaying(false);
  };

  const otherParticipant = getOtherParticipantInfo();

  // Add a function to create and send a TicTacToe game
  const handleCreateTicTacToeGame = async () => {
    if (!user || !selectedChat) return;

    try {
      // Create a new tic-tac-toe game
      const newGame = {
        // Store the board as a JSON string instead of nested arrays
        board: JSON.stringify(createEmptyBoard()),
        currentTurn: "X", // X always goes first
        players: {
          X: user.uid,
          O: null,
        },
        winner: null,
        status: "waiting",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      };

      // Add the game to Firestore
      const gameRef = await addDoc(collection(db, "tictactoe"), newGame);

      // Create message with game reference
      const messageData: any = {
        chatId: selectedChat.id,
        sender: user.uid,
        text: "I've started a Tic Tac Toe game! Join to play!",
        status: "sent",
        readBy: [user.uid],
        tictactoeGameId: gameRef.id,
      };

      // Add the message to the chat
      await addDoc(collection(db, "messages"), {
        ...messageData,
        timestamp: serverTimestamp(),
      });

      // Update last message in chat
      const chatRef = doc(db, "chats", selectedChat.id);
      await updateDoc(chatRef, {
        lastMessage: {
          text: "TicTacToe game",
          sender: user.uid,
          timestamp: serverTimestamp(),
          read: false,
        },
        updatedAt: serverTimestamp(),
      });

      // Scroll to bottom
      setShouldScrollToBottom(true);
    } catch (error) {
      console.error("Error creating TicTacToe game:", error);
      toast({
        title: "Error",
        description: "Failed to create a TicTacToe game. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md p-8"
        >
          <div className="mb-6 flex justify-center">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            >
              <MessageCircle className="h-20 w-20 text-indigo-300 dark:text-indigo-700" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Select a chat to start messaging
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose an existing conversation or start a new one by selecting a
            user from the list
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Chat header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between border-b bg-white p-4 dark:bg-gray-900 dark:border-gray-800"
      >
        {otherParticipant && (
          <div className="flex items-center gap-3">
            {isMobile && onBackToList && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackToList}
                className="mr-2 md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Avatar className="border-2 border-indigo-200 dark:border-indigo-900">
              <AvatarImage
                src={otherParticipant.photoURL || "/placeholder.svg"}
              />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                {getInitials(otherParticipant.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {otherParticipant.displayName}
              </h2>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">
                Online
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-800"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar"
        style={{
          maxHeight: isMobile ? "calc(100vh - 240px)" : "100%",
        }}
      >
        <AnimatePresence>
          {messages.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className={
                    editingMessage?.id === message.id ? "relative" : ""
                  }
                >
                  {editingMessage?.id === message.id && (
                    <div className="absolute -left-2 -right-2 -top-2 -bottom-2 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 pointer-events-none" />
                  )}
                  <MessageItem
                    message={message}
                    isOwnMessage={message.sender === user?.uid}
                    onDelete={() => handleDeleteMessage(message.id)}
                    onRecall={() => handleRecallMessage(message.id)}
                    onEdit={() => {
                      // Only allow editing if user is admin
                      if (isAdmin) {
                        setEditingMessage(message);
                        setMessageText(message.text);
                        if (message.richText) {
                          setRichText(message.richText);
                          setIsUsingRichText(true);
                        } else {
                          setIsUsingRichText(false);
                        }
                      }
                    }}
                    participantsInfo={selectedChat.participantsInfo}
                    isAdmin={isAdmin}
                  />
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  No messages yet. Start the conversation!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Audio preview */}
      <AnimatePresence>
        {audioPreviewUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3 bg-indigo-50 dark:bg-indigo-900/30 border-t border-indigo-100 dark:border-indigo-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleAudioPlayback}
                  className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-700"
                >
                  {isAudioPlaying ? (
                    <Pause className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Play className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </Button>
                <div>
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    Audio Recording
                  </p>
                  <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                    {audioPreviewRef.current?.duration
                      ? `${Math.floor(
                          audioPreviewRef.current.duration / 60
                        )}:${Math.floor(audioPreviewRef.current.duration % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : "00:00"}
                  </p>
                </div>
                <audio
                  ref={audioPreviewRef}
                  src={audioPreviewUrl}
                  className="hidden"
                  onEnded={handleAudioEnded}
                  onLoadedMetadata={() => setShouldScrollToBottom(true)} // Force scroll update when audio loads
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Store the current URL to revoke it
                    const urlToRevoke = audioPreviewUrl;

                    // Clear state first
                    setAudioPreviewUrl(null);
                    setAudioChunks([]);
                    setIsAudioPlaying(false);

                    // Then revoke the URL
                    if (urlToRevoke) {
                      URL.revokeObjectURL(urlToRevoke);
                    }
                  }}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <X className="h-4 w-4 mr-1" />
                  Discard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadAudioRecording}
                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Add to Message
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-2 bg-gray-100 dark:bg-gray-800 flex flex-wrap gap-2 overflow-x-auto border-t dark:border-gray-700"
          >
            {attachments.map((attachment, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="relative"
                style={{
                  width: "calc(50% - 0.5rem)",
                  maxWidth: "150px",
                }}
              >
                {attachment.type === "image" ? (
                  <div className="aspect-square rounded-lg overflow-hidden shadow-md bg-white">
                    <div className="relative w-full h-full">
                      <img
                        src={attachment.url || "/placeholder.svg"}
                        alt={attachment.name}
                        className="w-full h-full object-contain"
                        onLoad={() => setShouldScrollToBottom(true)} // Force scroll update when image loads
                      />
                      {attachment.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                          <div className="text-white text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                            <span className="text-xs mt-1 block">
                              {Math.round(attachment.progress)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : attachment.type === "video" ? (
                  <div className="aspect-square rounded-lg overflow-hidden shadow-md bg-black">
                    <div className="relative w-full h-full flex items-center justify-center">
                      <Video className="h-8 w-8 text-white opacity-70" />
                      {attachment.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <div className="text-white text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                            <span className="text-xs mt-1 block">
                              {Math.round(attachment.progress)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-md">
                    <div className="relative w-full h-full flex items-center justify-center">
                      <File className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
                      {attachment.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                          <div className="text-white text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                            <span className="text-xs mt-1 block">
                              {Math.round(attachment.progress)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <button
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
                  onClick={() => {
                    // Store the URL to revoke
                    const urlToRevoke = attachment.localUrl;

                    // Remove the attachment
                    setAttachments(attachments.filter((_, i) => i !== index));

                    // Revoke the URL if it exists
                    if (urlToRevoke) {
                      URL.revokeObjectURL(urlToRevoke);
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editing indicator */}
      {editingMessage && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border-t border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
          <div className="flex items-center">
            <Edit className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-2" />
            <span className="text-sm text-indigo-700 dark:text-indigo-300">
              Editing message
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelEdit}
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      {/* Message input */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800"
      >
        {isUsingRichText ? (
          <RichTextEditor
            value={richText}
            onChange={setRichText}
            onEnterPress={
              editingMessage ? handleEditMessage : handleSendMessage
            }
          />
        ) : (
          <Textarea
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="resize-none bg-gray-50 border-gray-200 focus:border-indigo-300 focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:focus:border-indigo-700 dark:focus:ring-indigo-700"
            rows={isMobile ? 2 : 3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                editingMessage ? handleEditMessage() : handleSendMessage();
              }
            }}
          />
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-800"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={(e) =>
                e.target.files && handleFileUpload(e.target.files)
              }
            />

            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsUsingRichText(!isUsingRichText)}
                type="button"
                className={`text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-800 ${
                  isUsingRichText
                    ? "bg-indigo-50 text-indigo-600 dark:bg-gray-800 dark:text-indigo-400"
                    : ""
                }`}
              >
                <Edit className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              type="button"
              className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-800"
            >
              <Smile className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateTicTacToeGame}
              type="button"
              className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-800"
              title="Start a Tic Tac Toe game"
            >
              <GamepadIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRecording(!isRecording)}
              type="button"
              className={`text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-gray-800 ${
                isRecording
                  ? "bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400"
                  : ""
              }`}
              disabled={!!audioPreviewUrl} // Disable recording button if there's already a preview
            >
              <Mic className="h-5 w-5" />
            </Button>

            {isRecording && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1 }}
                className="text-sm text-red-500 dark:text-red-400 hidden sm:inline-block"
              >
                Recording...
              </motion.span>
            )}

            {isEmojiPickerOpen && (
              <div
                className={`absolute ${
                  isMobile ? "bottom-16 left-0 right-0 mx-auto" : "bottom-20"
                } z-10`}
              >
                <EmojiPicker
                  onSelect={handleAddEmoji}
                  onClose={() => setIsEmojiPickerOpen(false)}
                />
              </div>
            )}
          </div>

          <Button
            onClick={editingMessage ? handleEditMessage : handleSendMessage}
            type="button"
            disabled={
              (!messageText.trim() &&
                !richText.trim() &&
                attachments.length === 0) ||
              attachments.some((att) => att.isUploading)
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-700 dark:hover:bg-indigo-800"
          >
            {editingMessage ? "Update" : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </motion.div>

      {/* Audio notification */}
      <audio
        ref={audioNotificationRef}
        src="/notification.mp3"
        className="hidden"
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
