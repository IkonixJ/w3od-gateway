import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Award,
  X,
  Check,
  Search,
  Users,
  Gift,
  Crown,
  Trophy,
  Heart,
  GraduationCap,
  HandHeart,
  Mic,
  Presentation,
  Palette as PaletteIcon,
  Code,
  Rocket,
  type LucideIcon,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  NeonInput,
  Badge,
  Avatar,
  Divider,
} from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import { useAuth } from '@/context/AuthProvider';
import {
  getAllBadges,
  awardBadge,
  revokeBadge,
  getUserBadges,
  rarityLabel,
  rarityTone,
} from '@/lib/campaign-service';
import { supabase } from '@/lib/supabase';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { Badge as BadgeType } from '@/types/campaigns';

const BADGE_ICONS: Record<string, LucideIcon> = {
  crown: Crown,
  rocket: Rocket,
  trophy: Trophy,
  heart: Heart,
  'graduation-cap': GraduationCap,
  'hand-heart': HandHeart,
  mic: Mic,
  presentation: Presentation,
  palette: PaletteIcon,
  code: Code,
  users: Users,
};

export default function AdminBadgesScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminBadgesContent />
    </RequireRole>
  );
}

function AdminBadgesContent() {
  const router = useRouter();
  const { profile } = useAuth();
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Member search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Award modal
  const [awardModal, setAwardModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awardSuccess, setAwardSuccess] = useState(false);

  // User badges view modal
  const [userBadgesModal, setUserBadgesModal] = useState(false);
  const [userBadges, setUserBadges] = useState<BadgeType[]>([]);
  const [viewedMember, setViewedMember] = useState<MemberSearchResult | null>(null);

  const loadBadges = useCallback(async () => {
    const data = await getAllBadges();
    setBadges(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBadges();
  }, [loadBadges]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, email')
      .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`)
      .neq('id', profile?.id ?? '')
      .limit(20);
    setSearching(false);
    if (error || !data) {
      setSearchResults([]);
      return;
    }
    setSearchResults(data as MemberSearchResult[]);
  };

  const openAwardModal = (badge: BadgeType, member?: MemberSearchResult) => {
    setSelectedBadge(badge);
    setSelectedMember(member ?? null);
    setAwardError(null);
    setAwardModal(true);
  };

  const handleAward = async () => {
    if (!selectedBadge || !selectedMember) return;
    setAwarding(true);
    setAwardError(null);
    const result = await awardBadge(selectedMember.id, selectedBadge.id);
    setAwarding(false);
    if (!result.success) {
      setAwardError(result.error ?? 'Award failed.');
      return;
    }
    setAwardSuccess(true);
    setAwardModal(false);
    setTimeout(() => setAwardSuccess(false), 2500);
  };

  const handleViewBadges = async (member: MemberSearchResult) => {
    setViewedMember(member);
    setUserBadgesModal(true);
    const data = await getUserBadges(member.id);
    setUserBadges(data);
  };

  const handleRevoke = async (memberId: string, badgeId: string) => {
    await revokeBadge(memberId, badgeId);
    if (viewedMember) {
      const data = await getUserBadges(viewedMember.id);
      setUserBadges(data);
    }
  };

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonAmber} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonAmber} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>
            MANAGE BADGES
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {awardSuccess && (
          <View style={styles.successToast}>
            <Check color={Palette.neonLime} size={18} strokeWidth={2.5} />
            <NeonText variant="body" weight="semiBold" tone="lime">
              Badge awarded successfully
            </NeonText>
          </View>
        )}

        {/* Available badges */}
        <View style={styles.section}>
          <SectionTitle title="Available Badges" tone="amber" />
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={Palette.neonAmber} />
            </View>
          ) : (
            badges.map((badge) => {
              const Icon = BADGE_ICONS[badge.icon] ?? Award;
              return (
                <GlassCard key={badge.id} tone={rarityTone(badge.rarity)} padding={Spacing['4']} style={styles.badgeCard}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badgeIconWrap, { backgroundColor: `${badge.color}20`, borderColor: badge.color }]}>
                      <Icon color={badge.color} size={22} />
                    </View>
                    <View style={styles.badgeMeta}>
                      <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.badgeName}>
                        {badge.name}
                      </NeonText>
                      <NeonText variant="body" tone="muted" style={styles.badgeDesc}>
                        {badge.description}
                      </NeonText>
                      <Badge tone={rarityTone(badge.rarity)} style={styles.rarityBadge}>
                        {rarityLabel(badge.rarity).toUpperCase()}
                      </Badge>
                    </View>
                  </View>
                  <NeonButton
                    variant="amber"
                    size="sm"
                    fullWidth
                    leftIcon={<Gift color="#1A1200" size={15} />}
                    onPress={() => openAwardModal(badge)}
                  >
                    Award to Member
                  </NeonButton>
                </GlassCard>
              );
            })
          )}
        </View>

        {/* Member search */}
        <View style={styles.section}>
          <SectionTitle title="Find a Member" tone="cyan" />
          <NeonInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search by username, name, or email..."
            leftIcon={<Search color={Palette.textTertiary} size={18} />}
            tone="cyan"
          />

          {searching && (
            <View style={styles.searchingWrap}>
              <ActivityIndicator size="small" color={Palette.neonCyan} />
            </View>
          )}

          {!searching && searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((member) => (
                <GlassCard key={member.id} tone="cyan" padding={Spacing['3']} style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    <Avatar uri={member.avatar_url} displayName={member.display_name ?? member.username} size="sm" />
                    <View style={styles.memberMeta}>
                      <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.memberName}>
                        {member.display_name ?? member.username ?? 'Member'}
                      </NeonText>
                      {member.username && (
                        <NeonText variant="body" tone="magenta" style={styles.memberUsername}>
                          @{member.username}
                        </NeonText>
                      )}
                    </View>
                  </View>
                  <View style={styles.memberActions}>
                    <Pressable onPress={() => handleViewBadges(member)} style={styles.memberActionBtn}>
                      <Users color={Palette.neonCyan} size={14} />
                      <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.memberActionText}>
                        View Badges
                      </NeonText>
                    </Pressable>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}

          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <NeonText variant="body" tone="muted" style={styles.noResults}>
              No members found matching "{searchQuery}"
            </NeonText>
          )}
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Award badge modal */}
      <Modal visible={awardModal} transparent animationType="fade" onRequestClose={() => setAwardModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'web' ? undefined : 'padding'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop} />
          <GlassCard tone="amber" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <NeonText variant="heading" weight="semiBold" tone="amber">
                AWARD BADGE
              </NeonText>
              <Pressable onPress={() => setAwardModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            {selectedBadge && (
              <View style={styles.selectedBadgeBox}>
                <View style={[styles.badgeIconWrap, { backgroundColor: `${selectedBadge.color}20`, borderColor: selectedBadge.color }]}>
                  {(() => {
                    const Icon = BADGE_ICONS[selectedBadge.icon] ?? Award;
                    return <Icon color={selectedBadge.color} size={22} />;
                  })()}
                </View>
                <View style={styles.selectedBadgeMeta}>
                  <NeonText variant="heading" weight="semiBold" tone="amber">
                    {selectedBadge.name}
                  </NeonText>
                  <NeonText variant="body" tone="muted" style={styles.selectedBadgeDesc}>
                    {selectedBadge.description}
                  </NeonText>
                </View>
              </View>
            )}

            {!selectedMember ? (
              <NeonText variant="body" tone="muted" style={styles.modalSub}>
                Search for a member above, then select them to award this badge.
              </NeonText>
            ) : (
              <View style={styles.selectedMemberBox}>
                <Avatar uri={selectedMember.avatar_url} displayName={selectedMember.display_name ?? selectedMember.username} size="sm" />
                <View style={styles.selectedMemberMeta}>
                  <NeonText variant="body" weight="semiBold" tone="cyan">
                    {selectedMember.display_name ?? selectedMember.username}
                  </NeonText>
                  <NeonText variant="body" tone="muted" style={styles.selectedMemberEmail}>
                    {selectedMember.email}
                  </NeonText>
                </View>
              </View>
            )}

            {selectedMember && (
              <View style={styles.searchInline}>
                <NeonInput
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder="Search another member..."
                  leftIcon={<Search color={Palette.textTertiary} size={16} />}
                  tone="cyan"
                />
                {searchResults.length > 0 && (
                  <View style={styles.inlineResults}>
                    {searchResults.slice(0, 5).map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => {
                          setSelectedMember(m);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        style={styles.inlineResult}
                      >
                        <Avatar uri={m.avatar_url} displayName={m.display_name ?? m.username} size="xs" />
                        <Text style={styles.inlineResultText} numberOfLines={1}>
                          {m.display_name ?? m.username}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {awardError && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">
                  {awardError}
                </NeonText>
              </View>
            )}

            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setAwardModal(false)} disabled={awarding}>
                Cancel
              </NeonButton>
              <View style={styles.flex1}>
                <NeonButton
                  variant="amber"
                  fullWidth
                  loading={awarding}
                  disabled={!selectedMember || !selectedBadge}
                  onPress={handleAward}
                  leftIcon={<Check color="#1A1200" size={16} />}
                >
                  Award Badge
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* User badges view modal */}
      <Modal visible={userBadgesModal} transparent animationType="fade" onRequestClose={() => setUserBadgesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <NeonText variant="heading" weight="semiBold" tone="cyan">
                {viewedMember?.display_name ?? viewedMember?.username ?? 'Member'} BADGES
              </NeonText>
              <Pressable onPress={() => setUserBadgesModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            {userBadges.length === 0 ? (
              <NeonText variant="body" tone="muted" style={styles.noBadgesText}>
                This member has no badges yet.
              </NeonText>
            ) : (
              <ScrollView style={styles.badgesScroll} showsVerticalScrollIndicator={false}>
                {userBadges.map((badge) => {
                  const Icon = BADGE_ICONS[badge.icon] ?? Award;
                  return (
                    <View key={badge.id}>
                      <View style={styles.userBadgeRow}>
                        <View style={[styles.badgeIconWrap, { backgroundColor: `${badge.color}20`, borderColor: badge.color }]}>
                          <Icon color={badge.color} size={18} />
                        </View>
                        <View style={styles.userBadgeMeta}>
                          <NeonText variant="body" weight="semiBold" tone="amber" style={styles.userBadgeName}>
                            {badge.name}
                          </NeonText>
                          <NeonText variant="body" tone="muted" style={styles.userBadgeDate}>
                            {badge.awarded_at ? `Awarded ${new Date(badge.awarded_at).toLocaleDateString()}` : ''}
                          </NeonText>
                        </View>
                        <Pressable
                          onPress={() => viewedMember && handleRevoke(viewedMember.id, badge.id)}
                          hitSlop={10}
                        >
                          <Text style={styles.revokeText}>Revoke</Text>
                        </Pressable>
                      </View>
                      <Divider tone="white" />
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <NeonButton variant="ghost" fullWidth onPress={() => setUserBadgesModal(false)}>
              Close
            </NeonButton>
          </GlassCard>
        </View>
      </Modal>
    </ScreenShell>
  );
}

interface MemberSearchResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

function SectionTitle({ title, tone }: { title: string; tone: 'amber' | 'cyan' }) {
  const color = tone === 'amber' ? Palette.neonAmber : Palette.neonCyan;
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleAccent, { backgroundColor: color }]} />
      <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.sectionTitleText}>
        {title.toUpperCase()}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['5'],
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,255,156,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,156,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  section: {
    gap: Spacing['3'],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  sectionTitleAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionTitleText: {
    fontSize: Typography.sizes.md,
    letterSpacing: Typography.letterSpacings.wide,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: Spacing['4'],
  },
  badgeCard: {
    gap: Spacing['3'],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  badgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMeta: {
    flex: 1,
    gap: 2,
  },
  badgeName: {
    fontSize: Typography.sizes.base,
  },
  badgeDesc: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  rarityBadge: {
    marginTop: Spacing['1'],
  },
  searchingWrap: {
    alignItems: 'center',
    paddingVertical: Spacing['3'],
  },
  searchResults: {
    gap: Spacing['2'],
  },
  memberCard: {
    gap: Spacing['2'],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  memberMeta: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: Typography.sizes.sm,
  },
  memberUsername: {
    fontSize: Typography.sizes.xs,
  },
  memberActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  memberActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  memberActionText: {
    fontSize: Typography.sizes.xs,
  },
  noResults: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing['3'],
  },
  footerSpace: {
    height: Spacing['8'],
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenPadding,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5,6,10,0.75)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    gap: Spacing['4'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  selectedBadgeMeta: {
    flex: 1,
    gap: 2,
  },
  selectedBadgeDesc: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  modalSub: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  selectedMemberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  selectedMemberMeta: {
    flex: 1,
    gap: 2,
  },
  selectedMemberEmail: {
    fontSize: Typography.sizes.xs,
  },
  searchInline: {
    gap: Spacing['2'],
  },
  inlineResults: {
    gap: Spacing['1'],
    backgroundColor: Palette.glassDark,
    borderRadius: Radii.md,
    padding: Spacing['2'],
  },
  inlineResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['1'],
  },
  inlineResultText: {
    flex: 1,
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.sm,
    color: Palette.textSecondary,
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  flex1: {
    flex: 1,
  },
  // User badges modal
  noBadgesText: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing['4'],
  },
  badgesScroll: {
    maxHeight: 300,
  },
  userBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['2'],
  },
  userBadgeMeta: {
    flex: 1,
    gap: 2,
  },
  userBadgeName: {
    fontSize: Typography.sizes.sm,
  },
  userBadgeDate: {
    fontSize: Typography.sizes.xs,
  },
  revokeText: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.neonRose,
  },
});
