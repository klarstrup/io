export namespace Steam {
  export interface QueryData {
    AOWarningCookie?: null;
    achievements?: Achievements;
    StoreItem?: StoreItem;
    ProfileItemsEquipped?: ProfileItemsEquipped;
    PlayerLinkDetails?: PlayerLinkDetails;
    CookiePreferences?: CookiePreferences;
  }

  export interface CookiePreferences {
    version: number;
    preference_state: number;
    content_customization: null;
    valve_analytics: null;
    third_party_analytics: null;
    third_party_content: null;
    utm_enabled: boolean;
  }

  export interface PlayerLinkDetails {
    [key: string]: PlayerLinkDetailses;
  }

  export interface PlayerLinkDetailses {
    public_data: PublicData;
    private_data: PrivateData;
  }

  export interface PrivateData {
    persona_state: number;
    persona_state_flags: number;
    time_created: number;
  }

  export interface PublicData {
    steamid: string;
    visibility_state: number;
    profile_state: number;
    sha_digest_avatar: SHADigestAvatar;
    persona_name: string;
    profile_url: string;
    content_country_restricted: boolean;
  }

  export interface SHADigestAvatar {
    _t: number;
    v: number[];
  }

  export interface ProfileItemsEquipped {
    "76561197982266081": ProfileItemsEquipped76561197982266081;
  }

  export interface ProfileItemsEquipped76561197982266081 {
    profile_background: ProfileBackground;
    mini_profile_background: MiniProfileBackground;
    avatar_frame: AnimatedAvatar;
    animated_avatar: AnimatedAvatar;
    profile_modifier: MiniProfileBackground;
    steam_deck_keyboard_skin: MiniProfileBackground;
  }

  export interface AnimatedAvatar {
    communityitemid: string;
    image_small: string;
    image_large: string;
    name: string;
    item_title: string;
    item_description: string;
    appid: number;
    item_type: number;
    item_class: number;
    profile_colors: unknown[];
  }

  export interface MiniProfileBackground {
    profile_colors: unknown[];
  }

  export interface ProfileBackground {
    communityitemid: string;
    image_large: string;
    name: string;
    item_title: string;
    item_description: string;
    appid: number;
    item_type: number;
    item_class: number;
    movie_webm: string;
    movie_mp4: string;
    movie_webm_small: string;
    movie_mp4_small: string;
    profile_colors: unknown[];
  }

  export interface StoreItem {
    [key: string]: StoreItemes;
  }

  export interface StoreItemes {
    include_assets_without_overrides: IncludeAssetsWithoutOverrides;
    default_info: DefaultInfo;
  }

  export interface MongoSteamStoreItem
    extends IncludeAssetsWithoutOverrides, DefaultInfo {}
  {
  }

  export interface DefaultInfo {
    item_type: number;
    id: number;
    success: number;
    visible: boolean;
    name: string;
    store_url_path: string;
    store_url_slug: string;
    appid: number;
    type: number;
    included_types: unknown[];
    included_appids: unknown[];
    content_descriptorids: unknown[];
    categories: Categories;
  }

  export interface Categories {
    supported_player_categoryids: number[];
    feature_categoryids: number[];
    controller_categoryids: unknown[];
  }

  export interface IncludeAssetsWithoutOverrides {
    asset_url_format: string;
    main_capsule: string;
    small_capsule: string;
    small_capsule_2x: string;
    header: string;
    header_2x: string;
    page_background: string;
    hero_capsule: string;
    library_capsule: string;
    library_capsule_2x: string;
    library_hero: string;
    library_hero_2x: string;
    community_icon: string;
    page_background_path: string;
    raw_page_background: string;
    last_modified: number;
  }

  export interface Achievements {
    [appid: string]: Achievementses;
  }

  export interface Achievementses {
    user_achievements?: UserAchievementsBySteamID;
    schema?: Schema;
    globalpercentages?: Globalpercentages;
  }

  export interface Globalpercentages {
    percentages: { [key: string]: number };
  }

  export interface Schema {
    appid: number;
    language: string;
    groups: Group[];
    schema_hash: number;
    schema_version: number;
  }

  export interface Group {
    id: number;
    name: string;
    archived: boolean;
    ispublic: boolean;
    developeronly: boolean;
    dlcappid: number;
    order: number;
    achievements: Achievement[];
  }

  export interface Achievement {
    internal_key: number;
    api_name: string;
    name: string;
    description: string;
    hidden: boolean;
    archived: boolean;
    icon_achieved: string;
    icon_unachieved: string;
    groupid: number;
  }

  export interface MongoSteamAppAchievement extends Achievement {
    appid: number;
    language: string;
  }

  export interface UserAchievementsBySteamID {
    [steamid: string]: UserAchievementses;
  }

  export interface UserAchievementses {
    appid: number;
    steamid: string;
    achievements: { [key: string]: AchievementValue };
    groups: AchievementGroups;
    schema_hash: number;
  }

  export interface AchievementValue {
    internal_key: number;
    unlocked: boolean;
    unlock_time: number;
  }

  export interface MongoSteamUserAchievement extends AchievementValue {
    appid: number;
    steamid: string;
    unlocked_at: Date;
  }

  export interface AchievementGroups {
    "0": AchievementGroup;
  }

  export interface AchievementGroup {
    groupid: number;
    is_achievable: boolean;
    completed_achievements: number;
    is_completed: boolean;
  }
}
