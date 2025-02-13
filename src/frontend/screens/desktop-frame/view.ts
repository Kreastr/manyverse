// SPDX-FileCopyrightText: 2021 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import dropRepeatsByKeys from 'xstream-drop-repeats-by-keys';
import {h} from '@cycle/react';
import {PureComponent, ReactElement, createElement as $} from 'react';
import {View, Text, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {styles} from './styles';
import {t} from '../../drivers/localization';
import PublicTabIcon from '../../components/tab-buttons/PublicTabIcon';
import PrivateTabIcon from '../../components/tab-buttons/PrivateTabIcon';
import ActivityTabIcon from '../../components/tab-buttons/ActivityTabIcon';
import ConnectionsTabIcon from '../../components/tab-buttons/ConnectionsTabIcon';
import TabIcon from '../../components/tab-buttons/TabIcon';
import Avatar from '../../components/Avatar';
import LocalizedHumanTime from '../../components/LocalizedHumanTime';
import {Dimensions} from '../../global-styles/dimens';
import {Palette} from '../../global-styles/palette';
import {State} from './model';

class TopBarLeftSection extends PureComponent {
  public render() {
    return $(View, {style: styles.topBarLeftSection}, this.props.children);
  }
}

class TopBarRightSection extends PureComponent {
  public render() {
    return $(View, {style: styles.topBarRightSection}, this.props.children);
  }
}

class ProgressBar extends PureComponent<{progress: number}> {
  public render() {
    const progress = this.props.progress;
    const width = progress >= 1 ? '0%' : `${(progress * 100).toFixed(3)}%`;
    const doneStyle =
      progress >= 1 ? styles.progressDone : styles.progressUndone;

    return $(
      View,
      {key: 'p1', style: [styles.progressBasic, doneStyle, {width}]},
      [
        $(View, {
          key: 'p2',
          style: [
            styles.progressFlare,
            progress >= 1 ? styles.progressFlareDone : null,
          ],
        }),
      ],
    );
  }
}

class ExtraButton extends PureComponent<{
  accessibilityLabel?: string;
  iconName: string;
  label: string;
  onPress?: () => {};
}> {
  public render() {
    const {onPress, iconName, label, accessibilityLabel} = this.props;

    return h(Pressable, {
      onPress,
      children: () => [
        h(View, {key: 'r', style: styles.extraButton}, [
          h(Icon, {
            key: 'x',
            name: iconName,
            size: Dimensions.iconSizeNormal,
            color: Palette.textForBackgroundBrand,
            style: styles.extraButtonIcon,
          }),
          h(
            Text,
            {
              key: 'b',
              style: styles.extraButtonText,
              numberOfLines: 1,
              selectable: false,
            },
            label,
          ),
        ]),
      ],
      style: ({hovered}: any) => [
        hovered ? styles.extraButtonHovered : styles.extraButtonIdle,
      ],
      accessible: true,
      accessibilityRole: 'menuitem',
      accessibilityLabel,
    });
  }
}

type ViewState = Pick<State, 'currentTab'> &
  Pick<State, 'numOfPublicUpdates'> &
  Pick<State, 'numOfPrivateUpdates'> &
  Pick<State, 'numOfActivityUpdates'> &
  Pick<State, 'connections'> &
  Pick<State, 'name'> &
  Pick<State, 'readOnlyMode'> &
  Pick<State, 'selfAvatarUrl'> &
  Pick<State, 'combinedProgress'> &
  Pick<State, 'estimateProgressDone'>;

export default function view(
  state$: Stream<State>,
  children$: Stream<Array<ReactElement>>,
  localizationLoaded$: Stream<boolean>,
) {
  const initialViewState: ViewState = {
    currentTab: 'public',
    numOfPublicUpdates: 0,
    numOfPrivateUpdates: 0,
    numOfActivityUpdates: 0,
    selfAvatarUrl: '',
    readOnlyMode: false,
    combinedProgress: 0,
    estimateProgressDone: 0,
  };

  const viewState$ = (state$ as Stream<ViewState>)
    .compose(
      dropRepeatsByKeys([
        'currentTab',
        'numOfPublicUpdates',
        'numOfPrivateUpdates',
        'numOfActivityUpdates',
        'connections',
        'name',
        'readOnlyMode',
        'selfAvatarUrl',
        'combinedProgress',
        'estimateProgressDone',
      ]),
    )
    .startWith(initialViewState);

  return xs
    .combine(viewState$, children$, localizationLoaded$)
    .map(([state, children, localizationLoaded]) => {
      if (!localizationLoaded) {
        return h(View, {style: styles.screen}, [
          h(View, {style: styles.left}, [h(TopBarLeftSection)]),
        ]);
      }

      const status = state.connections?.status ?? 'bad';
      const initializedSSB = state.connections?.initializedSSB ?? false;
      const {combinedProgress, estimateProgressDone} = state;
      const progressLabelOpacity =
        state.combinedProgress > 0 && state.combinedProgress < 1 ? 1 : 0;

      return h(View, {style: styles.screen}, [
        h(ProgressBar, {progress: combinedProgress}),

        h(TopBarRightSection, [
          estimateProgressDone > 60e3
            ? h(Text, {style: styles.syncingEstimateText}, [
                t('drawer.menu.ready_estimate.label'),
                ' ',
                h(LocalizedHumanTime, {
                  time: Date.now() + estimateProgressDone,
                }),
              ])
            : null,
        ]),

        h(View, {style: styles.left}, [
          h(TopBarLeftSection, [
            h(
              Text,
              {style: [styles.progressLabel, {opacity: progressLabelOpacity}]},
              t('drawer.menu.preparing_database.label'),
            ),
          ]),

          h(View, {style: styles.leftMenu}, [
            h(PublicTabIcon, {
              style: styles.leftMenuTabButton,
              isSelected: state.currentTab === 'public',
              numOfUpdates: state.numOfPublicUpdates,
            }),
            h(PrivateTabIcon, {
              style: styles.leftMenuTabButton,
              isSelected: state.currentTab === 'private',
              numOfUpdates: state.numOfPrivateUpdates,
            }),
            h(ActivityTabIcon, {
              style: styles.leftMenuTabButton,
              isSelected: state.currentTab === 'activity',
              numOfUpdates: state.numOfActivityUpdates,
            }),
            h(ConnectionsTabIcon, {
              style: styles.leftMenuTabButton,
              isSelected: state.currentTab === 'connections',
              status,
              allowWarningColors: initializedSSB,
            }),

            state.readOnlyMode
              ? h(ExtraButton, {
                  sel: 'exit-read-only',
                  label: t('read_only_mode.migrate_button'),
                  iconName: 'transfer-right',
                })
              : null,

            h(View, {style: styles.spacer}),

            h(TabIcon, {
              sel: 'more',
              iconName: 'dots-horizontal',
              label: t('drawer.menu.more.label'),
              accessibilityLabel: t('drawer.menu.more.accessibility_label'),
            }),
            h(TabIcon, {
              sel: 'settings',
              iconName: 'cog',
              label: t('drawer.menu.settings.label'),
              accessibilityLabel: t('drawer.menu.settings.accessibility_label'),
            }),
            h(TabIcon, {
              style: styles.myProfileButton,
              sel: 'self-profile',
              iconName: 'account-circle',
              label: state.name ?? t('drawer.menu.my_profile.label'),
              accessibilityLabel: t(
                'drawer.menu.my_profile.accessibility_label',
              ),
              renderIconExtras: () =>
                state.selfAvatarUrl
                  ? h(Avatar, {
                      style: styles.avatar,
                      size: Dimensions.iconSizeNormal,
                      backgroundColor: Palette.textWeak,
                      url: state.selfAvatarUrl,
                    })
                  : null,
            }),
          ]),
        ]),

        h(View, {style: styles.centerAndRight}, [...children]),
      ]);
    });
}
