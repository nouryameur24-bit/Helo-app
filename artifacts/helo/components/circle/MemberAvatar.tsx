import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { getMemberColor } from '@/lib/circleUtils';
import type { CircleMember } from '@/lib/circleUtils';

interface MemberAvatarProps {
  member: CircleMember;
  size?: number;
}

function MemberAvatar({ member, size = 40 }: MemberAvatarProps) {
  const color = getMemberColor(member.user_id);
  const initial = (member.first_name || '?').charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.surface,
      }}
    >
      <ThemedText style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: size * 0.4, color: '#fff' }}>
        {initial}
      </ThemedText>
    </View>
  );
}

export default React.memo(MemberAvatar);
