import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Gift,
  Zap,
  Users,
  Check,
  X,
  ChevronDown,
  AlertTriangle,
  Megaphone,
  CircleCheck as CheckCircle2,
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
import {
  searchMembers,
  adminCreditReward,
  adminCreditMultiple,
  adminCreditCampaignParticipants,
  type AdminMember,
  type OperationResult,
} from '@/lib/admin-service';
import {
  getAllCampaigns,
  campaignStatusLabel,
  campaignStatusTone,
} from '@/lib/campaign-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { AdminCampaign } from '@/types/campaigns';

type Mode = 'single' | 'multiple' | 'campaign';

const MODE_TABS: { key: Mode; label: string; icon: React.ReactNode }[] = [
  { key: 'single', label: 'Single', icon: <Gift color={Palette.neonLime} size={15} /> },
  { key: 'multiple', label: 'Multiple', icon: <Users color={Palette.neonLime} size={15} /> },
  { key: 'campaign', label: 'Campaign', icon: <Megaphone color={Palette.neonLime} size={15} /> },
];

export default function AdminRewardsScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminRewardsContent />
    </RequireRole>
  );
}

function AdminRewardsContent() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('single');

  // Member search (shared by single + multiple)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminMember[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection state
  const [selectedSingle, setSelectedSingle] = useState<AdminMember | null>(null);
  const [selectedMultiple, setSelectedMultiple] = useState<AdminMember[]>([]);

  // Campaign mode
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdminCampaign | null>(null);
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);

  // Reward form
  const [amount, setAmount] = useState('');
  const [xp, setXp] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load campaigns once (lazy on first switch to campaign mode)
  const ensureCampaigns = useCallback(async () => {
    if (campaignsLoaded) return;
    setCampaignsLoading(true);
    const data = await getAllCampaigns();
    setCampaigns(data);
    setCampaignsLoaded(true);
    setCampaignsLoading(false);
  }, [campaignsLoaded]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const data = await searchMembers(query.trim(), 30);
      setSearchResults(data);
      setSearching(false);
    }, 300);
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    setCampaignDropdownOpen(false);
    if (m === 'campaign') ensureCampaigns();
  };

  const toggleMultiple = (member: AdminMember) => {
    setSelectedMultiple((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member]
    );
  };

  const removeFromMultiple = (id: string) => {
    setSelectedMultiple((prev) => prev.filter((m) => m.id !== id));
  };

  const selectCampaign = (c: AdminCampaign) => {
    setSelectedCampaign(c);
    setCampaignDropdownOpen(false);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    const amt = Number(amount) || 0;
    const xpVal = Number(xp) || 0;

    if (!reason.trim()) {
      setError('A reason is required for every credit.');
      return;
    }
    if (amt <= 0 && xpVal <= 0) {
      setError('Enter a W3OD amount or XP to credit.');
      return;
    }

    let target: string | string[] | null = null;
    let campaign: AdminCampaign | null = null;

    if (mode === 'single') {
      if (!selectedSingle) {
        setError('Search for and select a member first.');
        return;
      }
      target = selectedSingle.id;
    } else if (mode === 'multiple') {
      if (selectedMultiple.length === 0) {
        setError('Select at least one member to credit.');
        return;
      }
      target = selectedMultiple.map((m) => m.id);
    } else {
      if (!selectedCampaign) {
        setError('Select a campaign first.');
        return;
      }
      campaign = selectedCampaign;
    }

    setSubmitting(true);
    let result: OperationResult;
    let msg: string;

    if (mode === 'single' && target && typeof target === 'string') {
      result = await adminCreditReward(target, amt, xpVal, reason.trim());
      const name = selectedSingle?.display_name ?? selectedSingle?.username ?? 'member';
      msg = `Credited ${name}`;
    } else if (mode === 'multiple' && Array.isArray(target)) {
      result = await adminCreditMultiple(target, amt, xpVal, reason.trim());
      msg = `Credited ${result.count ?? target.length} members`;
    } else if (mode === 'campaign' && campaign) {
      result = await adminCreditCampaignParticipants(campaign.id, amt, xpVal, reason.trim());
      msg = `Credited ${result.count ?? 'campaign'} participants`;
    } else {
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'Crediting failed.');
      return;
    }

    setSuccessMessage(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);

    // Reset form + mode selection
    setAmount('');
    setXp('');
    setReason('');
    if (mode === 'single') setSelectedSingle(null);
    if (mode === 'multiple') setSelectedMultiple([]);
    if (mode === 'campaign') setSelectedCampaign(null);
  };

  const canSubmit =
    reason.trim().length > 0 &&
    (Number(amount) > 0 || Number(xp) > 0) &&
    ((mode === 'single' && !!selectedSingle) ||
      (mode === 'multiple' && selectedMultiple.length > 0) ||
      (mode === 'campaign' && !!selectedCampaign));

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonLime} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="lime" style={styles.title}>
            REWARDS
          </NeonText>
          <View style={styles.headerIconWrap}>
            <Gift color={Palette.neonLime} size={18} />
          </View>
        </View>

        {/* Subtitle */}
        <NeonText variant="body" tone="muted" style={styles.subtitle}>
          Credit W3OD tokens and XP to members manually.
        </NeonText>

        {/* Success toast */}
        {showSuccess && (
          <View style={styles.successToast}>
            <CheckCircle2 color={Palette.neonLime} size={18} strokeWidth={2.5} />
            <NeonText variant="body" weight="semiBold" tone="lime">
              {successMessage}
            </NeonText>
          </View>
        )}

        {/* Mode tabs */}
        <View style={styles.tabsRow}>
          {MODE_TABS.map((tab) => {
            const active = mode === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => switchMode(tab.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                {tab.icon}
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? Palette.neonLime : Palette.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Mode-specific target selection */}
        {mode === 'single' && (
          <SingleMode
            searchQuery={searchQuery}
            searching={searching}
            searchResults={searchResults}
            selectedSingle={selectedSingle}
            onSearch={handleSearch}
            onSelect={(m) => {
              setSelectedSingle(m);
              setSearchResults([]);
              setSearchQuery('');
              setError(null);
            }}
            onClear={() => setSelectedSingle(null)}
          />
        )}

        {mode === 'multiple' && (
          <MultipleMode
            searchQuery={searchQuery}
            searching={searching}
            searchResults={searchResults}
            selectedMultiple={selectedMultiple}
            onSearch={handleSearch}
            onToggle={toggleMultiple}
            onRemove={removeFromMultiple}
          />
        )}

        {mode === 'campaign' && (
          <CampaignMode
            campaigns={campaigns}
            loading={campaignsLoading}
            loaded={campaignsLoaded}
            selectedCampaign={selectedCampaign}
            dropdownOpen={campaignDropdownOpen}
            onToggleDropdown={() => setCampaignDropdownOpen((o) => !o)}
            onSelect={selectCampaign}
          />
        )}

        {/* Shared reward form */}
        <GlassCard tone="lime" gradientBorder padding={Spacing['5']} style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderAccent} />
            <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.formTitle}>
              REWARD DETAILS
            </NeonText>
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.flex1}>
              <NeonInput
                label="W3OD Amount"
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                tone="lime"
                keyboardType="numeric"
                leftIcon={<Gift color={Palette.textTertiary} size={16} />}
              />
            </View>
            <View style={styles.flex1}>
              <NeonInput
                label="XP"
                value={xp}
                onChangeText={(v) => setXp(v.replace(/[^0-9]/g, ''))}
                placeholder="0"
                tone="lime"
                keyboardType="numeric"
                leftIcon={<Zap color={Palette.textTertiary} size={16} />}
              />
            </View>
          </View>

          <NeonInput
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this reward being credited?"
            leftIcon={<AlertTriangle color={Palette.textTertiary} size={16} />}
            tone="lime"
            multiline
            style={styles.reasonInput}
          />

          {error && (
            <View style={styles.errorBox}>
              <AlertTriangle color={Palette.neonRose} size={15} />
              <NeonText variant="body" weight="medium" tone="rose" style={styles.errorText}>
                {error}
              </NeonText>
            </View>
          )}

          <NeonButton
            variant="success"
            fullWidth
            loading={submitting}
            disabled={!canSubmit}
            onPress={handleSubmit}
            leftIcon={<Check color="#021810" size={16} />}
          >
            {mode === 'campaign'
              ? 'Credit All Participants'
              : mode === 'multiple'
                ? `Credit ${selectedMultiple.length || ''} Members`
                : 'Credit Reward'}
          </NeonButton>
        </GlassCard>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Single mode ──────────────────────────────────────────────────────────────

function SingleMode({
  searchQuery,
  searching,
  searchResults,
  selectedSingle,
  onSearch,
  onSelect,
  onClear,
}: {
  searchQuery: string;
  searching: boolean;
  searchResults: AdminMember[];
  selectedSingle: AdminMember | null;
  onSearch: (q: string) => void;
  onSelect: (m: AdminMember) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.section}>
      <SectionLabel icon={<Search color={Palette.neonCyan} size={14} />} text="FIND A MEMBER" tone="cyan" />

      {selectedSingle ? (
        <GlassCard tone="cyan" gradientBorder padding={Spacing['4']} style={styles.selectedCard}>
          <View style={styles.selectedRow}>
            <Avatar
              uri={selectedSingle.avatar_url}
              displayName={selectedSingle.display_name ?? selectedSingle.username}
              size="md"
            />
            <View style={styles.selectedMeta}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.selectedName}>
                {selectedSingle.display_name ?? selectedSingle.username ?? 'Member'}
              </NeonText>
              {selectedSingle.username && (
                <NeonText variant="body" tone="magenta" style={styles.selectedUsername}>
                  @{selectedSingle.username}
                </NeonText>
              )}
              <NeonText variant="body" tone="muted" style={styles.selectedEmail}>
                {selectedSingle.email}
              </NeonText>
            </View>
            <Pressable onPress={onClear} hitSlop={10} style={styles.clearBtn}>
              <X color={Palette.neonRose} size={18} />
            </Pressable>
          </View>
        </GlassCard>
      ) : (
        <>
          <NeonInput
            value={searchQuery}
            onChangeText={onSearch}
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
                <Pressable key={member.id} onPress={() => onSelect(member)}>
                  <GlassCard tone="cyan" padding={Spacing['3']} style={styles.memberCard}>
                    <View style={styles.memberRow}>
                      <Avatar
                        uri={member.avatar_url}
                        displayName={member.display_name ?? member.username}
                        size="sm"
                      />
                      <View style={styles.memberMeta}>
                        <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.memberName}>
                          {member.display_name ?? member.username ?? 'Member'}
                        </NeonText>
                        {member.username && (
                          <NeonText variant="body" tone="magenta" style={styles.memberUsername}>
                            @{member.username}
                          </NeonText>
                        )}
                        <NeonText variant="body" tone="muted" style={styles.memberEmail}>
                          {member.email}
                        </NeonText>
                      </View>
                      <ChevronDown
                        color={Palette.neonCyan}
                        size={18}
                        style={{ transform: [{ rotate: '-90deg' }] }}
                      />
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          )}

          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <NeonText variant="body" tone="muted" style={styles.noResults}>
              No members found matching &quot;{searchQuery}&quot;
            </NeonText>
          )}
        </>
      )}
    </View>
  );
}

// ─── Multiple mode ────────────────────────────────────────────────────────────

function MultipleMode({
  searchQuery,
  searching,
  searchResults,
  selectedMultiple,
  onSearch,
  onToggle,
  onRemove,
}: {
  searchQuery: string;
  searching: boolean;
  searchResults: AdminMember[];
  selectedMultiple: AdminMember[];
  onSearch: (q: string) => void;
  onToggle: (m: AdminMember) => void;
  onRemove: (id: string) => void;
}) {
  const isSelected = (id: string) => selectedMultiple.some((m) => m.id === id);

  return (
    <View style={styles.section}>
      <View style={styles.multiHeader}>
        <SectionLabel icon={<Users color={Palette.neonMagenta} size={14} />} text="SELECT MEMBERS" tone="magenta" />
        {selectedMultiple.length > 0 && (
          <Badge tone="magenta">{selectedMultiple.length} SELECTED</Badge>
        )}
      </View>

      <NeonInput
        value={searchQuery}
        onChangeText={onSearch}
        placeholder="Search to add members..."
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
          {searchResults.map((member) => {
            const selected = isSelected(member.id);
            return (
              <Pressable key={member.id} onPress={() => onToggle(member)}>
                <GlassCard
                  tone={selected ? 'lime' : 'cyan'}
                  gradientBorder={selected}
                  padding={Spacing['3']}
                  style={styles.memberCard}
                >
                  <View style={styles.memberRow}>
                    <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                      {selected && <Check color={Palette.bg950} size={14} strokeWidth={3} />}
                    </View>
                    <Avatar
                      uri={member.avatar_url}
                      displayName={member.display_name ?? member.username}
                      size="sm"
                    />
                    <View style={styles.memberMeta}>
                      <NeonText
                        variant="body"
                        weight="semiBold"
                        tone={selected ? 'lime' : 'cyan'}
                        style={styles.memberName}
                      >
                        {member.display_name ?? member.username ?? 'Member'}
                      </NeonText>
                      {member.username && (
                        <NeonText variant="body" tone="magenta" style={styles.memberUsername}>
                          @{member.username}
                        </NeonText>
                      )}
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      )}

      {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
        <NeonText variant="body" tone="muted" style={styles.noResults}>
          No members found matching &quot;{searchQuery}&quot;
        </NeonText>
      )}

      {/* Selected chips */}
      {selectedMultiple.length > 0 && (
        <View style={styles.chipsWrap}>
          <Divider tone="white" />
          <NeonText variant="body" weight="semiBold" tone="lime" style={styles.chipsTitle}>
            SELECTED ({selectedMultiple.length})
          </NeonText>
          <View style={styles.chipsList}>
            {selectedMultiple.map((member) => (
              <View key={member.id} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {member.display_name ?? member.username ?? 'Member'}
                </Text>
                <Pressable onPress={() => onRemove(member.id)} hitSlop={8}>
                  <X color={Palette.neonRose} size={13} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Campaign mode ────────────────────────────────────────────────────────────

function CampaignMode({
  campaigns,
  loading,
  loaded,
  selectedCampaign,
  dropdownOpen,
  onToggleDropdown,
  onSelect,
}: {
  campaigns: AdminCampaign[];
  loading: boolean;
  loaded: boolean;
  selectedCampaign: AdminCampaign | null;
  dropdownOpen: boolean;
  onToggleDropdown: () => void;
  onSelect: (c: AdminCampaign) => void;
}) {
  return (
    <View style={styles.section}>
      <SectionLabel icon={<Megaphone color={Palette.neonAmber} size={14} />} text="SELECT CAMPAIGN" tone="amber" />

      {loading && (
        <View style={styles.searchingWrap}>
          <ActivityIndicator size="small" color={Palette.neonAmber} />
        </View>
      )}

      {!loading && loaded && campaigns.length === 0 ? (
        <GlassCard tone="amber" padding={Spacing['5']} style={styles.emptyCard}>
          <Megaphone color={Palette.textTertiary} size={36} />
          <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
            No campaigns available
          </NeonText>
          <NeonText variant="body" tone="muted" style={styles.emptySub}>
            Create a campaign first, then credit its approved participants here.
          </NeonText>
        </GlassCard>
      ) : (
        <>
          {/* Dropdown trigger */}
          <Pressable onPress={onToggleDropdown}>
            <GlassCard tone="amber" padding={Spacing['4']} style={styles.dropdownTrigger}>
              {selectedCampaign ? (
                <View style={styles.dropdownSelected}>
                  <View style={styles.dropdownSelectedLeft}>
                    <Megaphone color={Palette.neonAmber} size={18} />
                    <View style={styles.dropdownMeta}>
                      <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.dropdownTitle} numberOfLines={1}>
                        {selectedCampaign.title}
                      </NeonText>
                      <View style={styles.dropdownSubRow}>
                        <Users color={Palette.textTertiary} size={11} />
                        <Text style={styles.dropdownSubText}>
                          {selectedCampaign.participant_count} participants
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ChevronDown
                    color={Palette.neonAmber}
                    size={18}
                    style={{ transform: [{ rotate: dropdownOpen ? '180deg' : '0deg' }] }}
                  />
                </View>
              ) : (
                <View style={styles.dropdownPlaceholder}>
                  <Megaphone color={Palette.textTertiary} size={18} />
                  <NeonText variant="body" tone="muted">
                    Choose a campaign...
                  </NeonText>
                  <View style={styles.flex1} />
                  <ChevronDown
                    color={Palette.textTertiary}
                    size={18}
                    style={{ transform: [{ rotate: dropdownOpen ? '180deg' : '0deg' }] }}
                  />
                </View>
              )}
            </GlassCard>
          </Pressable>

          {/* Dropdown list */}
          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {campaigns.map((c) => (
                <Pressable key={c.id} onPress={() => onSelect(c)}>
                  <View
                    style={[
                      styles.dropdownItem,
                      selectedCampaign?.id === c.id && styles.dropdownItemSelected,
                    ]}
                  >
                    <View style={styles.dropdownItemLeft}>
                      <Megaphone color={Palette.neonAmber} size={15} />
                      <View style={styles.dropdownItemMeta}>
                        <Text style={styles.dropdownItemTitle} numberOfLines={1}>
                          {c.title}
                        </Text>
                        <Text style={styles.dropdownItemSub}>
                          {c.participant_count} participants
                        </Text>
                      </View>
                    </View>
                    <Badge tone={campaignStatusTone(c.status)}>
                      {campaignStatusLabel(c.status).toUpperCase()}
                    </Badge>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Warning + selected summary */}
          {selectedCampaign && (
            <GlassCard tone="amber" padding={Spacing['4']} style={styles.warnCard}>
              <View style={styles.warnRow}>
                <View style={styles.warnIconWrap}>
                  <AlertTriangle color={Palette.neonAmber} size={18} />
                </View>
                <View style={styles.flex1}>
                  <NeonText variant="body" weight="semiBold" tone="amber" style={styles.warnTitle}>
                    Credits ALL approved participants
                  </NeonText>
                  <NeonText variant="body" tone="muted" style={styles.warnSub}>
                    This will credit every member with an approved submission in
                    &quot;{selectedCampaign.title}&quot; ({selectedCampaign.participant_count} total).
                  </NeonText>
                </View>
              </View>
            </GlassCard>
          )}
        </>
      )}
    </View>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function SectionLabel({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: 'cyan' | 'magenta' | 'amber';
}) {
  const color = tone === 'cyan' ? Palette.neonCyan : tone === 'magenta' ? Palette.neonMagenta : Palette.neonAmber;
  return (
    <View style={styles.sectionLabelRow}>
      <View style={[styles.sectionLabelAccent, { backgroundColor: color }]} />
      {icon}
      <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.sectionLabelText}>
        {text}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['4'],
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
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(182,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
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
  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['3'],
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: Palette.glass300,
  },
  tabActive: {
    borderColor: 'rgba(182,255,0,0.5)',
    backgroundColor: 'rgba(182,255,0,0.1)',
  },
  tabText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  // Sections
  section: {
    gap: Spacing['3'],
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  sectionLabelAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionLabelText: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  // Search results
  searchingWrap: {
    alignItems: 'center',
    paddingVertical: Spacing['3'],
  },
  searchResults: {
    gap: Spacing['2'],
  },
  memberCard: {
    gap: Spacing['1'],
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
  memberEmail: {
    fontSize: Typography.sizes.xs,
  },
  noResults: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing['3'],
  },
  // Single selected
  selectedCard: {
    gap: Spacing['2'],
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  selectedMeta: {
    flex: 1,
    gap: 2,
  },
  selectedName: {
    fontSize: Typography.sizes.base,
  },
  selectedUsername: {
    fontSize: Typography.sizes.xs,
  },
  selectedEmail: {
    fontSize: Typography.sizes.xs,
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Multiple
  multiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0,240,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Palette.neonLime,
    borderColor: Palette.neonLime,
  },
  chipsWrap: {
    gap: Spacing['2'],
  },
  chipsTitle: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  chipsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radii.full,
    backgroundColor: 'rgba(182,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.3)',
    maxWidth: 160,
  },
  chipText: {
    flex: 1,
    fontFamily: Typography.families.bodySemiBold,
    fontSize: Typography.sizes.xs,
    color: Palette.neonLime,
  },
  // Campaign dropdown
  dropdownTrigger: {
    gap: Spacing['2'],
  },
  dropdownSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  dropdownSelectedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  dropdownMeta: {
    flex: 1,
    gap: 2,
  },
  dropdownTitle: {
    fontSize: Typography.sizes.base,
  },
  dropdownSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownSubText: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textSecondary,
  },
  dropdownPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  dropdownList: {
    gap: Spacing['1'],
    backgroundColor: Palette.glassDark,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
    padding: Spacing['2'],
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing['2'],
    paddingHorizontal: Spacing['2'],
    paddingVertical: Spacing['3'],
    borderRadius: Radii.sm,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(255,184,0,0.1)',
  },
  dropdownItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  dropdownItemMeta: {
    flex: 1,
    gap: 2,
  },
  dropdownItemTitle: {
    flex: 1,
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.sm,
    color: Palette.textPrimary,
  },
  dropdownItemSub: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textSecondary,
  },
  warnCard: {
    gap: Spacing['2'],
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['3'],
  },
  warnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnTitle: {
    fontSize: Typography.sizes.sm,
  },
  warnSub: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  // Empty
  emptyCard: {
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['6'],
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
  },
  emptySub: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Form
  formCard: {
    gap: Spacing['3'],
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  formHeaderAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: Palette.neonLime,
  },
  formTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  flex1: {
    flex: 1,
  },
  reasonInput: {
    marginTop: Spacing['1'],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  errorText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  footerSpace: {
    height: Spacing['8'],
  },
});
