/* Copyright (C) 2018 Greenbone Networks GmbH
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
import React from 'react';

import Capabilities from 'gmp/capabilities/capabilities';

import {
  cleanup,
  fireEvent,
  rendererWith,
} from 'web/utils/testing';

import DetailsLink from '../detailslink';

afterEach(cleanup);

describe('DetailsLink tests', () => {

  test('should render DetailsLink', () => {
    const {render} = rendererWith({capabilities: true, router: true});
    const {element} = render(
      <DetailsLink
        title="Foo"
        type="foo"
        id="bar"
      >
        Foo
      </DetailsLink>
    );

    expect(element).toHaveTextContent('Foo');
    expect(element).toHaveAttribute('title', 'Foo');
  });

  test('should route to url', () => {
    const {render, history} = rendererWith({capabilities: true, router: true});

    const {element} = render(
      <DetailsLink
        title="Foo"
        type="foo"
        id="1"
      >
        Foo
      </DetailsLink>
    );

    expect(history.location.pathname).toEqual('/');

    fireEvent.click(element);

    expect(history.location.pathname).toEqual('/foo/1');
  });

  test('should url encode id', () => {
    const {render, history} = rendererWith({capabilities: true, router: true});

    const {element} = render(
      <DetailsLink
        title="Foo"
        type="foo"
        id="cpe:/a:jenkins:jenkins:2.141"
      >
        Foo
      </DetailsLink>
    );

    expect(history.location.pathname).toEqual('/');

    fireEvent.click(element);

    expect(history.location.pathname).toEqual(
      '/foo/cpe%3A%2Fa%3Ajenkins%3Ajenkins%3A2.141');
  });

  test('should not route to url in text mode', () => {
    const {render, history} = rendererWith({capabilities: true, router: true});

    const {element} = render(
      <DetailsLink
        title="Foo"
        type="foo"
        id="1"
        textOnly={true}
      >
        Foo
      </DetailsLink>
    );

    expect(history.location.pathname).toEqual('/');

    fireEvent.click(element);

    expect(history.location.pathname).toEqual('/');
  });

  test('should not route to url without capabilities', () => {
    const capabilities = new Capabilities();
    const {render, history} = rendererWith({capabilities, router: true});

    const {element} = render(
      <DetailsLink
        title="Foo"
        type="foo"
        id="1"
      >
        Foo
      </DetailsLink>
    );

    expect(history.location.pathname).toEqual('/');

    fireEvent.click(element);

    expect(history.location.pathname).toEqual('/');
  });

});

// vim: set ts=2 sw=2 tw=80: