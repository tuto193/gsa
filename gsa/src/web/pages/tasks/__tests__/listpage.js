/* Copyright (C) 2019-2020 Greenbone Networks GmbH
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
import {act} from 'react-dom/test-utils';

import Task, {TASK_STATUS} from 'gmp/models/task';

import {setLocale} from 'gmp/locale/lang';

import Capabilities from 'gmp/capabilities/capabilities';
import CollectionCounts from 'gmp/collection/collectioncounts';

import Filter from 'gmp/models/filter';

import {setTimezone, setUsername} from 'web/store/usersettings/actions';
import {entitiesLoadingActions} from 'web/store/entities/tasks';
import {loadingActions} from 'web/store/usersettings/defaults/actions';
import {defaultFilterLoadingActions} from 'web/store/usersettings/defaultfilters/actions';

import {
  rendererWith,
  waitForElement,
  fireEvent,
  withEmptyMock,
} from 'web/utils/testing';
import {MockedProvider} from '@apollo/react-testing';
import TaskPage, {ToolBarIcons} from '../listpage';
import {GET_TASKS} from 'web/pages/tasks/graphql';

setLocale('en');

window.URL.createObjectURL = jest.fn();

const lastReport = {
  uuid: '1234',
  severity: '5.0',
  timestamp: '2020-02-27T13:20:45Z',
};

const mockTask = {
  data: {
    tasks: {
      nodes: [
        {
          name: 'foo',
          uuid: '1234',
          permissions: [
            {
              name: 'Everything',
            },
          ],
          lastReport,
          reportCount: {
            total: 1,
            finished: 1,
          },
          status: TASK_STATUS.done,
          target: {
            name: 'Target',
            uuid: 'id1',
          },
          trend: null,
          comment: 'bar',
          owner: 'admin',
          preferences: null,
          schedule: null,
          alerts: [],
          scanConfig: {
            uuid: 'id2',
            name: 'lorem',
            trash: false,
          },
          scanner: {
            uuid: 'id3',
            name: 'ipsum',
            scannerType: 'dolor',
          },
          hostsOrdering: null,
          observers: {
            users: ['john', 'jane'],
            roles: [
              {
                name: 'r1',
              },
              {
                name: 'r2',
              },
            ],
            groups: [
              {
                name: 'g1',
              },
              {
                name: 'g2',
              },
            ],
          },
        },
      ],
    },
  },
};

const task = Task.fromObject(mockTask.data.tasks.nodes[0]);

const mocks = [
  {
    request: {
      query: GET_TASKS,
      variables: {filterString: 'foo=bar rows=2'},
    },
    result: mockTask,
  },
  {
    request: {
      query: GET_TASKS,
      variables: {filterString: ''},
    },
    result: mockTask,
  },
  {
    request: {
      query: GET_TASKS,
      variables: {filterString: ''},
    },
    result: mockTask,
  },
];

const caps = new Capabilities(['everything']);
const wrongCaps = new Capabilities(['get_config']);

const reloadInterval = 1;
const manualUrl = 'test/';

const currentSettings = jest.fn().mockResolvedValue({
  foo: 'bar',
});

const getFilters = jest.fn().mockReturnValue(
  Promise.resolve({
    data: [],
    meta: {
      filter: Filter.fromString(),
      counts: new CollectionCounts(),
    },
  }),
);

const getDashboardSetting = jest.fn().mockResolvedValue({
  data: [],
  meta: {
    filter: Filter.fromString(),
    counts: new CollectionCounts(),
  },
});

const getUserSetting = jest.fn().mockResolvedValue({
  filter: null,
});

const getAggregates = jest.fn().mockResolvedValue({
  data: [],
  meta: {
    filter: Filter.fromString(),
    counts: new CollectionCounts(),
  },
});

const getTasks = jest.fn().mockResolvedValue({
  data: [task],
  meta: {
    filter: Filter.fromString(),
    counts: new CollectionCounts(),
  },
});

const getReportFormats = jest.fn().mockResolvedValue({
  data: [],
  meta: {
    filter: Filter.fromString(),
    counts: new CollectionCounts(),
  },
});

const renewSession = jest.fn().mockResolvedValue({
  foo: 'bar',
});

describe('TaskPage tests', () => {
  test('should render full TaskPage', async () => {
    const gmp = {
      tasks: {
        get: getTasks,
        getSeverityAggregates: getAggregates,
        getHighResultsAggregates: getAggregates,
        getStatusAggregates: getAggregates,
      },
      filters: {
        get: getFilters,
      },
      reportformats: {
        get: getReportFormats,
      },
      dashboard: {
        getSetting: getDashboardSetting,
      },
      reloadInterval,
      settings: {manualUrl},
      user: {currentSettings, getSetting: getUserSetting},
    };

    const {render, store} = rendererWith({
      gmp,
      capabilities: true,
      store: true,
      router: true,
    });

    store.dispatch(setTimezone('CET'));
    store.dispatch(setUsername('admin'));

    const defaultSettingfilter = Filter.fromString('foo=bar');
    store.dispatch(loadingActions.success({rowsperpage: {value: '2'}}));
    store.dispatch(
      defaultFilterLoadingActions.success('task', defaultSettingfilter),
    );

    const counts = new CollectionCounts({
      first: 1,
      all: 1,
      filtered: 1,
      length: 1,
      rows: 10,
    });
    const filter = Filter.fromString('first=1 rows=10');
    const loadedFilter = Filter.fromString('first=1 rows=10');
    store.dispatch(
      entitiesLoadingActions.success([task], filter, loadedFilter, counts),
    );

    const {baseElement, getAllByTestId} = render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <TaskPage />
      ),
    );

    await waitForElement(() => baseElement.querySelectorAll('table'));

    const display = getAllByTestId('grid-item');
    let icons = getAllByTestId('svg-icon');
    const inputs = baseElement.querySelectorAll('input');
    const selects = getAllByTestId('select-selected-value');

    // Toolbar Icons
    expect(icons[0]).toHaveAttribute('title', 'Help: Tasks');
    expect(icons[1]).toHaveTextContent('wizard.svg');
    expect(icons[2]).toHaveTextContent('new.svg');

    // Powerfilter
    expect(inputs[0]).toHaveAttribute('name', 'userFilterString');
    expect(icons[3]).toHaveAttribute('title', 'Update Filter');
    expect(icons[4]).toHaveAttribute('title', 'Remove Filter');
    expect(icons[5]).toHaveAttribute('title', 'Reset to Default Filter');
    expect(icons[6]).toHaveAttribute('title', 'Help: Powerfilter');
    expect(icons[7]).toHaveAttribute('title', 'Edit Filter');
    expect(selects[0]).toHaveAttribute('title', 'Loaded filter');
    expect(selects[0]).toHaveTextContent('--');

    // Dashboard
    expect(icons[9]).toHaveAttribute('title', 'Add new Dashboard Display');
    expect(icons[10]).toHaveAttribute('title', 'Reset to Defaults');
    expect(display[0]).toHaveTextContent('Tasks by Severity Class (Total: 0)');
    expect(display[1]).toHaveTextContent(
      'Tasks with most High Results per Host',
    );
    expect(display[2]).toHaveTextContent('Tasks by Status (Total: 0)');

    await waitForElement(() => baseElement.querySelectorAll('th'));

    const header = baseElement.querySelectorAll('th');

    // Table
    expect(header[0]).toHaveTextContent('Name');
    expect(header[1]).toHaveTextContent('Status');
    expect(header[2]).toHaveTextContent('Reports');
    expect(header[3]).toHaveTextContent('Last Report');
    expect(header[4]).toHaveTextContent('Severity');
    expect(header[5]).toHaveTextContent('Trend');
    expect(header[6]).toHaveTextContent('Actions');

    const row = baseElement.querySelectorAll('tr');

    expect(row[1]).toHaveTextContent('foo');
    expect(row[1]).toHaveTextContent('(bar)');
    expect(row[1]).toHaveTextContent('Done');
    expect(row[1]).toHaveTextContent('Thu, Feb 27, 2020 2:20 PM CET');
    expect(row[1]).toHaveTextContent('5.0 (Medium)');

    icons = getAllByTestId('svg-icon');

    expect(icons[24]).toHaveAttribute(
      'title',
      'Task made visible for:\nUsers john, jane\nRoles r1, r2\nGroups g1, g2',
    );
    expect(icons[25]).toHaveAttribute('title', 'Start');
    expect(icons[26]).toHaveAttribute('title', 'Task is not stopped');
    expect(icons[27]).toHaveAttribute('title', 'Move Task to trashcan');
    expect(icons[28]).toHaveAttribute('title', 'Edit Task');
    expect(icons[29]).toHaveAttribute('title', 'Clone Task');
    expect(icons[30]).toHaveAttribute('title', 'Export Task');
  });

  test('should call commands for bulk actions', async () => {
    const deleteByFilter = jest.fn().mockResolvedValue({
      foo: 'bar',
    });

    const exportByFilter = jest.fn().mockResolvedValue({
      foo: 'bar',
    });

    const gmp = {
      tasks: {
        get: getTasks,
        getSeverityAggregates: getAggregates,
        getHighResultsAggregates: getAggregates,
        getStatusAggregates: getAggregates,
        deleteByFilter,
        exportByFilter,
      },
      filters: {
        get: getFilters,
      },
      reportformats: {
        get: getReportFormats,
      },
      dashboard: {
        getSetting: getDashboardSetting,
      },
      reloadInterval,
      settings: {manualUrl},
      user: {renewSession, currentSettings, getSetting: getUserSetting},
    };

    const {render, store} = rendererWith({
      gmp,
      capabilities: true,
      store: true,
      router: true,
    });

    store.dispatch(setTimezone('CET'));
    store.dispatch(setUsername('admin'));

    const defaultSettingfilter = Filter.fromString('foo=bar');
    store.dispatch(loadingActions.success({rowsperpage: {value: '2'}}));
    store.dispatch(
      defaultFilterLoadingActions.success('task', defaultSettingfilter),
    );

    const counts = new CollectionCounts({
      first: 1,
      all: 1,
      filtered: 1,
      length: 1,
      rows: 10,
    });
    const filter = Filter.fromString('first=1 rows=10');
    const loadedFilter = Filter.fromString('first=1 rows=10');
    store.dispatch(
      entitiesLoadingActions.success([task], filter, loadedFilter, counts),
    );

    const {baseElement, getAllByTestId} = render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <TaskPage />
      ),
    );

    await waitForElement(() => baseElement.querySelectorAll('table'));

    const icons = getAllByTestId('svg-icon');

    await act(async () => {
      expect(icons[32]).toHaveAttribute(
        'title',
        'Move page contents to trashcan',
      );
      fireEvent.click(icons[32]);
      expect(deleteByFilter).toHaveBeenCalled();

      expect(icons[33]).toHaveAttribute('title', 'Export page contents');
      fireEvent.click(icons[33]);
      expect(exportByFilter).toHaveBeenCalled();
    });
  });
});

describe('TaskPage ToolBarIcons test', () => {
  test('should render', () => {
    const handleAdvancedTaskWizardClick = jest.fn();
    const handleModifyTaskWizardClick = jest.fn();
    const handleContainerTaskCreateClick = jest.fn();
    const handleTaskCreateClick = jest.fn();
    const handleTaskWizardClick = jest.fn();

    const gmp = {
      settings: {manualUrl},
    };

    const {render} = rendererWith({
      gmp,
      capabilities: caps,
      router: true,
    });

    const {element, getAllByTestId} = render(
      withEmptyMock(
        <ToolBarIcons
          onAdvancedTaskWizardClick={handleAdvancedTaskWizardClick}
          onModifyTaskWizardClick={handleModifyTaskWizardClick}
          onContainerTaskCreateClick={handleContainerTaskCreateClick}
          onTaskCreateClick={handleTaskCreateClick}
          onTaskWizardClick={handleTaskWizardClick}
        />,
      ),
    );
    expect(element).toMatchSnapshot();

    const links = element.querySelectorAll('a');
    const icons = getAllByTestId('svg-icon');

    expect(icons[0]).toHaveAttribute('title', 'Help: Tasks');
    expect(links[0]).toHaveAttribute(
      'href',
      'test/en/scanning.html#managing-tasks',
    );
  });

  test('should call click handlers', () => {
    const handleAdvancedTaskWizardClick = jest.fn();
    const handleModifyTaskWizardClick = jest.fn();
    const handleContainerTaskCreateClick = jest.fn();
    const handleTaskCreateClick = jest.fn();
    const handleTaskWizardClick = jest.fn();

    const gmp = {
      settings: {manualUrl},
    };

    const {render} = rendererWith({
      gmp,
      capabilities: caps,
      router: true,
    });

    const {baseElement} = render(
      withEmptyMock(
        <ToolBarIcons
          onAdvancedTaskWizardClick={handleAdvancedTaskWizardClick}
          onModifyTaskWizardClick={handleModifyTaskWizardClick}
          onContainerTaskCreateClick={handleContainerTaskCreateClick}
          onTaskCreateClick={handleTaskCreateClick}
          onTaskWizardClick={handleTaskWizardClick}
        />,
      ),
    );

    const divs = baseElement.querySelectorAll('div');

    fireEvent.click(divs[5]);
    expect(handleTaskWizardClick).toHaveBeenCalled();
    expect(divs[5]).toHaveTextContent('Task Wizard');

    fireEvent.click(divs[6]);
    expect(handleAdvancedTaskWizardClick).toHaveBeenCalled();
    expect(divs[6]).toHaveTextContent('Advanced Task Wizard');

    fireEvent.click(divs[7]);
    expect(handleModifyTaskWizardClick).toHaveBeenCalled();
    expect(divs[7]).toHaveTextContent('Modify Task Wizard');

    fireEvent.click(divs[9]);
    expect(handleTaskCreateClick).toHaveBeenCalled();
    expect(divs[9]).toHaveTextContent('New Task');

    fireEvent.click(divs[10]);
    expect(handleContainerTaskCreateClick).toHaveBeenCalled();
    expect(divs[10]).toHaveTextContent('New Container Task');
  });

  test('should not show icons if user does not have the right permissions', () => {
    const handleAdvancedTaskWizardClick = jest.fn();
    const handleModifyTaskWizardClick = jest.fn();
    const handleContainerTaskCreateClick = jest.fn();
    const handleTaskCreateClick = jest.fn();
    const handleTaskWizardClick = jest.fn();

    const gmp = {
      settings: {manualUrl},
    };

    const {render} = rendererWith({
      gmp,
      capabilities: wrongCaps,
      router: true,
    });

    const {queryAllByTestId} = render(
      withEmptyMock(
        <ToolBarIcons
          onAdvancedTaskWizardClick={handleAdvancedTaskWizardClick}
          onModifyTaskWizardClick={handleModifyTaskWizardClick}
          onContainerTaskCreateClick={handleContainerTaskCreateClick}
          onTaskCreateClick={handleTaskCreateClick}
          onTaskWizardClick={handleTaskWizardClick}
        />,
      ),
    );

    const icons = queryAllByTestId('svg-icon');
    expect(icons.length).toBe(1);
    expect(icons[0]).toHaveAttribute('title', 'Help: Tasks');
  });
});
