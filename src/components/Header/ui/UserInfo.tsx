import React from "react";
import styles from "../Header.module.scss";
import type { User } from "@/types/apis";

interface UserInfoProps {
  user: User;
}
/**
 * 사용자 정보(아바타, 이름)를 표시하는 컴포넌트
 * @param {UserInfoProps} props - 사용자 정보 객체
 */
const UserInfo: React.FC<UserInfoProps> = ({ user }) => (
  <div className={styles.user}>
    <img
      src={user.avatar_url || "/default-avatar.png"}
      alt={user.name}
      className={styles.userAvatar}
    />
    <span className={styles.userName}>{user.name}</span>
  </div>
);
export default React.memo(UserInfo);
