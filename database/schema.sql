-- ============================================================
-- FunZone - MySQL 8 database schema
-- Run: mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS funzone
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE funzone;

DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS match_players;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS room_players;
DROP TABLE IF EXISTS game_rooms;
DROP TABLE IF EXISTS player_profiles;
DROP TABLE IF EXISTS users;

-- ------------------------------------------------------------
-- Accounts
-- ------------------------------------------------------------
CREATE TABLE users (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  username      VARCHAR(32)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Player profile (one-to-one with users)
-- ------------------------------------------------------------
CREATE TABLE player_profiles (
  user_id       CHAR(36)     NOT NULL PRIMARY KEY,
  avatar        VARCHAR(64)  NOT NULL DEFAULT 'rocket',
  avatar_color  VARCHAR(16)  NOT NULL DEFAULT 'violet',
  bio           VARCHAR(240) NOT NULL DEFAULT '',
  xp            INT          NOT NULL DEFAULT 0,
  level         INT          NOT NULL DEFAULT 1,
  total_matches INT          NOT NULL DEFAULT 0,
  wins          INT          NOT NULL DEFAULT 0,
  losses        INT          NOT NULL DEFAULT 0,
  draws         INT          NOT NULL DEFAULT 0,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Rooms (a room is created for every game session)
-- ------------------------------------------------------------
CREATE TABLE game_rooms (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  code        VARCHAR(8)   NOT NULL,
  game_type   VARCHAR(32)  NOT NULL,
  host_id     CHAR(36)     NOT NULL,
  max_players TINYINT      NOT NULL DEFAULT 2,
  is_private  TINYINT(1)   NOT NULL DEFAULT 1,
  status      ENUM('waiting','playing','finished') NOT NULL DEFAULT 'waiting',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at   DATETIME     NULL DEFAULT NULL,
  CONSTRAINT uq_rooms_code UNIQUE (code),
  CONSTRAINT fk_rooms_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_rooms_status (status),
  INDEX idx_rooms_game (game_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- players inside a room
-- ------------------------------------------------------------
CREATE TABLE room_players (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  room_id    CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NOT NULL,
  is_host    TINYINT(1)   NOT NULL DEFAULT 0,
  is_ready   TINYINT(1)   NOT NULL DEFAULT 0,
  seat       TINYINT      NOT NULL DEFAULT 0,
  joined_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_room_player UNIQUE (room_id, user_id),
  CONSTRAINT fk_rp_room FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rp_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Completed (or in-progress) matches
-- ------------------------------------------------------------
CREATE TABLE matches (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  room_id         CHAR(36)     NOT NULL,
  game_type       VARCHAR(32)  NOT NULL,
  winner_id       CHAR(36)     NULL DEFAULT NULL,
  is_draw         TINYINT(1)   NOT NULL DEFAULT 0,
  duration_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  final_state     JSON         NULL DEFAULT NULL,
  status          ENUM('playing','finished') NOT NULL DEFAULT 'playing',
  started_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at        DATETIME     NULL DEFAULT NULL,
  CONSTRAINT fk_matches_room FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_winner FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_matches_game (game_type),
  INDEX idx_matches_started (started_at),
  INDEX idx_matches_winner (winner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE match_players (
  id        CHAR(36)     NOT NULL PRIMARY KEY,
  match_id  CHAR(36)     NOT NULL,
  user_id   CHAR(36)     NOT NULL,
  score     INT          NOT NULL DEFAULT 0,
  position  TINYINT      NOT NULL DEFAULT 1,
  outcome   ENUM('win','loss','draw') NOT NULL DEFAULT 'loss',
  CONSTRAINT uq_match_player UNIQUE (match_id, user_id),
  CONSTRAINT fk_mp_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mp_user (user_id),
  INDEX idx_mp_match (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Achievements
-- ------------------------------------------------------------
CREATE TABLE achievements (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  code        VARCHAR(48)  NOT NULL,
  name        VARCHAR(80)  NOT NULL,
  description VARCHAR(180) NOT NULL,
  icon        VARCHAR(16)  NOT NULL DEFAULT 'trophy',
  CONSTRAINT uq_achievement_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_achievements (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  user_id        CHAR(36)     NOT NULL,
  achievement_id CHAR(36)     NOT NULL,
  unlocked_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id),
  CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ua_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seed achievements (safe to re-run)
-- ------------------------------------------------------------
INSERT INTO achievements (id, code, name, description, icon) VALUES
  ('10000000-0000-4000-8000-000000000001', 'first_match', 'First Steps', 'Play your first match', 'gamepad'),
  ('10000000-0000-4000-8000-000000000002', 'first_win', 'Sweet Victory', 'Win your first match', 'trophy'),
  ('10000000-0000-4000-8000-000000000003', 'five_wins', 'On a Roll', 'Win 5 matches', 'fire'),
  ('10000000-0000-4000-8000-000000000004', 'all_games', 'Explorer', 'Play all five games', 'compass'),
  ('10000000-0000-4000-8000-000000000005', 'level_5', 'Veteran', 'Reach level 5', 'star');
