/* Copyright (C) 2017-2020 Greenbone Networks GmbH
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import React from 'react';

import _ from 'gmp/locale';

import {
  SCANCONFIG_TREND_DYNAMIC,
  SCANCONFIG_TREND_STATIC,
} from 'gmp/models/scanconfig';

import PropTypes from 'web/utils/proptypes';

import TrendNoChangeIcon from 'web/components/icon/trendnochangeicon';
import TrendMoreIcon from 'web/components/icon/trendmoreicon';

const Trend = ({trend, titleDynamic, titleStatic, ...props}) => {
  if (trend === SCANCONFIG_TREND_DYNAMIC) {
    return <TrendMoreIcon alt={_('Dynamic')} title={titleDynamic} {...props} />;
  }
  if (trend === SCANCONFIG_TREND_STATIC) {
    return (
      <TrendNoChangeIcon alt={_('Static')} title={titleStatic} {...props} />
    );
  }
  return <span>{_('N/A')}</span>;
};

Trend.propTypes = {
  titleDynamic: PropTypes.string,
  titleStatic: PropTypes.string,
  trend: PropTypes.oneOf([0, 1]),
};

export default Trend;

// vim: set ts=2 sw=2 tw=80:
