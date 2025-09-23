export const DB_TABLES = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  PARTICIPANTS: 'participants',
  USERS: 'users',
};

export const DB_COLUMNS = {
  ID: 'id',
  UPDATED_AT: 'updated_at',
  USER_ID: 'user_id',
  AVATAR_URL: 'avatar_url',
  USERNAME: 'username',
  CONTENT: 'content',
  CREATED_AT: 'created_at',
  SENDER_ID: 'sender_id',
  CONVERSATION_ID: 'conversation_id',
  LAST_READ_AT: 'last_read_at',
  CONTENT_TEXT: 'contentText',
  MEDIA_URL: 'media_url',
  MEDIA_TYPE: 'media_type',
};

export const DB_DIALECT = {
  POSTGRES: 'postgres',
};

export const DB_UUID_FUNCTIONS = {
  UUIDV4: 'DataType.UUIDV4',
};

export const DB_CONSTRAINTS = {
  ON_DELETE_CASCADE: 'CASCADE',
  ON_DELETE_SET_NULL: 'SET NULL',
  CONVERSATION_USER_UNIQUE: 'conversation_user_unique_constraint',
};

export const DB_DEFAULT_VALUES = {
  TIMESTAMP_START: '1970-01-01'
};
