// =============================================================================
// ENUMS FOR TYPE SAFETY
// =============================================================================

export enum NotificationType {
  LIKE = 'like',
  DISLIKE = 'dislike',
  COMMENT = 'comment',
  FOLLOW = 'follow',
}

export enum SocketEvent {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',

  // Chat events
  JOIN_CONVERSATION = 'join_conversation',
  LEAVE_CONVERSATION = 'leave_conversation',
  SWITCH_CONVERSATION = 'switch_conversation',
  SEND_MESSAGE = 'send_message',
  RECEIVE_MESSAGE = 'receive_message',
  UNREAD_MESSAGE_NOTIFICATION = 'unread_message_notification',

  // Notification events
  NOTIFICATION = 'notification',
}

export enum DatabaseDialect {
  POSTGRES = 'postgres',
}

export enum WebSocketNamespace {
  CHAT = 'chat',
  NOTIFICATIONS = '',
}

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

// =============================================================================
// MAIN CONFIGURATION OBJECT
// =============================================================================

export const CONFIG = {
  SERVER: {
    DEFAULT_PORT: 3002,
    API_PREFIX: 'api',
  },

  DATABASE: {
    POSTGRES: {
      DIALECT: DatabaseDialect.POSTGRES,
      LOGGING: false,
      SYNCHRONIZE: false,
      AUTO_LOAD_MODELS: true,
    },
    MONGODB: {
      CONNECTION_NAME: 'MongoDB',
    },
  },

  WEBSOCKET: {
    NAMESPACES: {
      CHAT: WebSocketNamespace.CHAT,
      NOTIFICATIONS: WebSocketNamespace.NOTIFICATIONS,
    },
    CORS: {
      ORIGIN: '*',
      CREDENTIALS: true,
    },
    TIMEOUTS: {
      PING_TIMEOUT: 60000, // 60 seconds
      PING_INTERVAL: 25000, // 25 seconds
    },
    TRANSPORTS: ['websocket', 'polling'],
  },

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_STRING: '1',
    DEFAULT_LIMIT: 20,
    DEFAULT_LIMIT_STRING: '20',
    DEFAULT_OFFSET_MULTIPLIER: 1, // For (page - 1) * limit calculation
  },

  NOTIFICATION: {
    DEFAULT_LIMIT: 20,
    SORT_ORDER: -1, // Descending order (newest first)
    DEFAULT_READ_STATUS: false,
  },

  FCM: {
    WEBPUSH: {
      ICON: '/favicon.ico',
      BADGE: '/favicon.ico',
      REQUIRE_INTERACTION: true,
    },
    DEFAULTS: {
      FALLBACK_URL: '/',
      TEST_TITLE: 'Test',
      TEST_BODY: 'Test',
      TEST_DATA: { test: 'true' },
    },
    ERROR_CODES: {
      INVALID_REGISTRATION_TOKEN: 'messaging/invalid-registration-token',
      REGISTRATION_TOKEN_NOT_REGISTERED:
        'messaging/registration-token-not-registered',
    },
    NOTIFICATIONS: {
      TITLES: {
        LIKE: (username: string) => `${username} liked your post`,
        DISLIKE: (username: string) => `${username} disliked your post`,
        COMMENT: (username: string) => `${username} commented on your post`,
        FOLLOW: (username: string) => `${username} started following you`,
        DEFAULT: (username: string) => `New notification from ${username}`,
      },
      BODIES: {
        LIKE: (username: string) => `${username} liked your post. Tap to view.`,
        DISLIKE: (username: string) =>
          `${username} disliked your post. Tap to view.`,
        COMMENT: (username: string) =>
          `${username} left a comment on your post. Tap to view.`,
        FOLLOW: (username: string) =>
          `${username} is now following you. Check out their profile!`,
        DEFAULT: (username: string) =>
          `You have a new notification from ${username}.`,
      },
      URLS: {
        POST: (postId: string) => `/posts/${postId}`,
        PROFILE: (userId: string) => `/profile/${userId}`,
        FEED: '/feed',
      },
    },
  },

  API: {
    BACKEND: {
      DEFAULT_URL: 'http://localhost:4000',
      TIMEOUT: 5000,
      ENDPOINTS: {
        USER_BY_ID: (id: string) => `/api/users/id/${id}`,
        FCM_TOKENS: (userId: string) =>
          `/api/internal/users/${userId}/fcm-tokens`,
        FCM_TOKEN_CLEANUP: (userId: string) =>
          `/api/internal/users/${userId}/fcm-tokens`,
      },
      HEADERS: {
        CONTENT_TYPE: 'application/json',
        USER_AGENT: 'notification-service',
        X_SERVICE: 'internal',
      },
    },
  },

  CHAT: {
    CONVERSATION_PARTICIPANT_COUNT: 2,
    MESSAGE_QUERY_LIMIT: 1, // For LIMIT 1 in lastMessage subquery
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
  },

  TABLE_NAMES: {
    CONVERSATIONS: 'conversations',
    MESSAGES: 'messages',
    PARTICIPANTS: 'participants',
    USERS: 'users',
    NOTIFICATIONS: 'notifications',
  },

  DB_COLUMNS: {
    // Common columns
    ID: 'id',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at',

    // User columns
    USER_ID: 'user_id',
    USERNAME: 'username',
    AVATAR_URL: 'avatar_url',
    NAME: 'name',

    // Chat columns
    CONVERSATION_ID: 'conversation_id',
    SENDER_ID: 'sender_id',
    CONTENT: 'content',
    CONTENT_TEXT: 'contentText',
    MEDIA_URL: 'media_url',
    MEDIA_TYPE: 'media_type',
    LAST_READ_AT: 'last_read_at',

    // Notification columns
    RECIPIENT: 'recipient',
    TYPE: 'type',
    READ: 'read',
  },

  DEFAULT_VALUES: {
    TIMESTAMP_START: '1970-01-01',
    LAST_READ_DATE: '1970-01-01',
  },

  VALIDATION: {
    MESSAGE: {
      REQUIRED_FIELDS: ['conversationId', 'senderId'],
    },
    NOTIFICATION: {
      REQUIRED_FIELDS: ['recipient', 'sender', 'type'],
    },
    CONVERSATION: {
      REQUIRED_FIELDS: ['receiverId'],
    },
  },
};

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

export const ENV = {
  MONGO_URI:
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/postify_notifications', // will remove later
  JWT_SECRET: process.env.JWT_SECRET || '63ekHvEI7Na2hmnOYjqZEtv27kMkXmMJ',
  PORT: process.env.PORT ? Number(process.env.PORT) : 3002,
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgres://postify_user:123456@localhost:5432/postify_db',
};

// =============================================================================
// API ROUTES
// =============================================================================

export const ROUTES = {
  CHAT: {
    BASE: '/chat',
    CONVERSATIONS: '/conversations',
    CONVERSATION_READ: '/conversations/:id/read',
    CONVERSATION_MESSAGES: '/conversations/:id/messages',
  },

  NOTIFICATIONS: {
    BASE: '/notifications',
    READ: '/read',
  },
};

// =============================================================================
// MESSAGES
// =============================================================================

export const MESSAGES = {
  COMMON: {
    SERVER_ERROR: 'A server error occurred. Please try again later.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    VALIDATION_ERROR: 'Validation Error: One or more fields are invalid.',
  },

  CHAT: {
    CANNOT_CONVERSE_WITH_SELF: 'Cannot create a conversation with yourself.',
    SENDER_RECEIVER_IDS_REQUIRED:
      'Both senderId and receiverId must be provided.',
    MESSAGE_NOT_FOUND_AFTER_CREATION: 'Message not found after creation',
  },

  AUTH: {
    NO_TOKEN_PROVIDED: 'No token provided',
    INVALID_TOKEN: 'Invalid WebSocket connection',
    JWT_SECRET_NOT_DEFINED: 'JWT_SECRET is not defined',
    NO_TOKEN_DISCONNECTING: 'No token provided, disconnecting client.',
    JWT_SECRET_UNDEFINED_CONFIG: 'JWT_SECRET is not defined in configuration.',
    TOKEN_NO_USER_ID: 'Token decoded but no user ID found. Disconnecting.',
  },

  DATABASE: {
    MONGO_URI_NOT_DEFINED: 'MONGO_URI is not defined in environment variables',
  },

  NOTIFICATION: {
    MARKED_AS_READ: 'Notifications marked as read',
  },

  LOG: {
    SERVER_STARTUP: '🚀 Notification And Chat service is running on:',
    CLIENT_CONNECTED: '✅ Client Connected: User',
    CLIENT_DISCONNECTED: 'Client disconnected:',
    USER_JOINED_ROOM: 'joined personal room with socket',
    AUTHENTICATION_ERROR: 'Authentication error, disconnecting client:',
    CONVERSATION_FOUND: 'Found existing conversationId:',
    CONVERSATION_CREATED: 'New conversation created with id:',
    MESSAGE_CREATED: 'Message created in transaction with temp id:',
    PARTICIPANTS_CREATED: 'Participants created for conversationId:',
    SEND_MESSAGE_ERROR: '[send_message] Error processing message:',
    CREATE_MESSAGE_ATTEMPT: '[createMessage] Attempting to create message:',
    CREATE_MESSAGE_SUCCESS:
      '[createMessage] Successfully created and returning message:',
    SEQUELIZE_ERROR: 'Sequelize message:',
    JWT_DECODE_ERROR: 'Failed to decode JWT:',

    // WebSocket Connection Messages
    CONNECTION_ATTEMPT: 'Connection attempt from client:',
    NO_TOKEN_PROVIDED: 'No token provided, disconnecting client.',
    JWT_SECRET_DEBUG: 'SECRET BEING USED: [',
    JWT_SECRET_EXISTS: 'JWT_SECRET exists:',
    FULL_TOKEN_RECEIVED: 'FULL TOKEN RECEIVED:',
    JWT_SECRET_NOT_DEFINED: 'JWT_SECRET is not defined in configuration.',
    TOKEN_NO_USER_ID: 'Token decoded but no user ID found. Disconnecting.',
    USER_RECONNECTING: 'reconnecting, removing old connection',

    // Room Management Messages
    SOCKET_JOINED_CONVERSATION: 'joined shared conversation room',
    SOCKET_LEFT_CONVERSATION: 'left conversation room',
    SOCKET_JOINED_NEW_CONVERSATION: 'joined conversation room',
    SOCKET_LEFT_SHARED_CONVERSATION: 'left shared conversation room',

    // Message Processing Messages
    SEND_MESSAGE_RECEIVED: '[send_message] Received:',
    SERVER_PROPERTIES: 'Server properties:',
    HAS_ADAPTER: 'Has adapter:',
    HAS_SOCKETS: 'Has sockets:',
    MESSAGE_SAVED_TO_DB: '[send_message] Message saved to DB:',
    EMITTING_RECEIVE_MESSAGE: "Emitting 'receive_message' to room",
    SENDING_UNREAD_NOTIFICATION: 'Sending unread message notification to user',
  },

  VALIDATION: {
    RECEIVER_ID_EMPTY: 'Receiver ID must not be empty.',
    RECEIVER_ID_INVALID_UUID: 'Receiver ID must be a valid UUID.',
  },

  SERVICE: {
    HELLO_WORLD: 'Hello World!',
  },

  // Additional constants from ecosystem
  HTTP: {
    CONTENT_TYPE: 'application/json',
    AUTHORIZATION: 'authorization',
  },

  PATTERNS: {
    BEARER_REGEX: /^Bearer\s+/,
    UUID_REGEX:
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
};

//============================================================================

// Backward compatibility with existing constants structure
export const CHAT_EVENTS = {
  JOIN_CONVERSATION: SocketEvent.JOIN_CONVERSATION,
  LEAVE_CONVERSATION: SocketEvent.LEAVE_CONVERSATION,
  SWITCH_CONVERSATION: SocketEvent.SWITCH_CONVERSATION,
  SEND_MESSAGE: SocketEvent.SEND_MESSAGE,
  RECEIVE_MESSAGE: SocketEvent.RECEIVE_MESSAGE,
  UNREAD_MESSAGE_NOTIFICATION: SocketEvent.UNREAD_MESSAGE_NOTIFICATION,
};

export const NOTIFICATION_EVENTS = {
  NEW_NOTIFICATION: SocketEvent.NOTIFICATION,
};

export const CHAT_ROUTES = ROUTES.CHAT;
export const NOTIFICATION_ROUTES = ROUTES.NOTIFICATIONS;
export const CHAT_ERROR_MESSAGES = MESSAGES.CHAT;

export const PAGINATION_DEFAULTS = {
  DEFAULT_OFFSET_MULTIPLIER: CONFIG.PAGINATION.DEFAULT_OFFSET_MULTIPLIER,
};

export const DEFAULT_VALUES = {
  LAST_READ_DATE: CONFIG.DEFAULT_VALUES.LAST_READ_DATE,
};

// Database table and column exports
export const TABLE_NAMES = CONFIG.TABLE_NAMES;
export const COLUMN_NAMES = CONFIG.DB_COLUMNS;
