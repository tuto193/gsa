/*
 * Greenbone Security Assistant
 * $Id$
 * Description: JavaScript for line charts in GSA.
 *
 * Authors:
 * Timo Pollmeier <timo.pollmeier@greenbone.net>
 *
 * Copyright:
 * Copyright (C) 2014 Greenbone Networks GmbH
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

(function(global, window, d3, console, gsa) {
  'use strict';

  gsa.register_chart_generator('line', LineChartGenerator);

  /*
  * Finds the index of a record by the value of a given field
  */
  function find_record_index(records, value, field) {
    for (var index in records) {
      if (records[index][field].getTime() === value.getTime()) {
        return index;
      }
    }
    return -1;
  }

  function is_defined(d) {
    return d !== undefined;
  }

  function LineChartGenerator() {
    // call super constructor
    gsa.BaseChartGenerator.call(this, 'bar');
  }

  LineChartGenerator.prototype = Object.create(
      gsa.BaseChartGenerator.prototype);
  LineChartGenerator.prototype.constructor = LineChartGenerator;

  LineChartGenerator.prototype.init = function() {
    this.margin = {top: 55, right: 55, bottom: 25, left: 55};

    this.x_scale = d3.time.scale.utc();
    this.y_scale = d3.scale.linear();
    this.y2_scale = d3.scale.linear();

    this.x_label = '';
    this.y_label = '';
    this.y2_label = '';

    this.x_field = 'value';
    this.y_field = 'c_count';
    this.y2_field = 'count';

    this.show_stat_type = true;

    this.setDataTransformFunc(this.time_line);
    this.setColorScale(d3.scale.category20());
    this.setTitleGenerator(gsa.title_static(
      gsa._('Loading line chart ...'), gsa._('Bubble Chart')));
  };

  LineChartGenerator.prototype.generate = function(original_data, controller,
      gen_params) {
    var display = controller.display();
    var update = this.mustUpdate(display);

    var data;

    var self = this;
    var x_data;
    var y_data;
    var y2_data;

    var line_1 = d3.svg.line()
      .x(function(d) { return self.x_scale(d[self.x_field]); })
      .y(function(d) { return self.y_scale(d[self.y_field]); })
      .defined(function(d) { return d[self.y_field] !== undefined; });

    var line_2 = d3.svg.line()
      .x(function(d) { return self.x_scale(d[self.x_field]); })
      .y(function(d) { return self.y2_scale(d[self.y2_field]); })
      .defined(function(d) { return d[self.y2_field] !== undefined; });

    var info_line;
    var info_box;
    var info_text_g;
    var info_text_lines;

    var x_min, x_max;
    var y_min, y_max;
    var y2_min, y2_max;

    var info_last_x;
    var height;
    var width;

    var column_info = original_data.column_info;

    function mouse_exited() {
      info_box.style('display', 'none');
      info_line.style('display', 'none');
      info_text_g.style('display', 'none');
    }

    function mouse_moved() {
      if (data.records.length === 0) {
        return;
      }

      info_box.style('display', 'block');
      info_line.style('display', 'block');
      info_text_g.style('display', 'block');

      var parent_rect = self.svg.node()
        .parentNode
        .parentNode
        .getBoundingClientRect();

      var mouse_x = d3.event.clientX - parent_rect.left - self.margin.left - 1;
      var mouse_y = d3.event.clientY - parent_rect.top - self.margin.top - 21;

      var rounded_x;
      var line_index;
      var line_x;
      var box_x;

      if (data.records.length > 1) {
        rounded_x = self.x_step.round(self.x_scale.invert(mouse_x));
        if (rounded_x.getTime() > x_max.getTime()) {
          rounded_x = x_max;
        }
        else if (rounded_x.getTime() < x_min.getTime()) {
          rounded_x = x_min;
        }

        line_index = find_record_index(data.records, rounded_x, self.x_field,
          false);
        line_x = self.x_scale(rounded_x);
      }
      else {
        rounded_x = x_min;
        line_index = 0;
        line_x = width / 2;
      }

      if (info_last_x === undefined ||
          info_last_x.getTime() !== rounded_x.getTime()) {
        var max_line_width = 0;

        info_last_x = rounded_x;

        var line;
        for (line in info_text_lines) {
          var bbox;
          var line_width;
          var d = data.records[line_index];
          if (d !== null && d !== undefined) {
            d = d[info_text_lines[line].field];
            d = gsa.format_data(d,
              data.column_info.columns[info_text_lines[line].field]);

            info_text_lines[line].elem.text(d);
          }
          else {
            if (line === 0) {
              info_text_lines[line].elem.text(
                  gsa.format_data(rounded_x, {data_type: 'js_date'}));
            }
            else {
              info_text_lines[line].elem.text('N/A');
            }
          }

          bbox = info_text_lines[line].elem.node()
            .getBoundingClientRect();
          line_width = bbox.width;

          if (info_text_lines[line].field !== self.x_field) {
            line_width += 25;
          }

          max_line_width = Math.max(max_line_width, line_width);
        }

        for (line in info_text_lines) {
          info_text_lines[line].elem.attr('x', max_line_width);
        }

        info_box
          .attr('width', max_line_width + 10)
          .attr('height', 53);
      }

      box_x = Math.min(width - info_box.attr('width') + self.margin.right,
          Math.max(-self.margin.left,
            mouse_x - info_box.attr('width') / 2));

      info_box
        .text('')
        .attr('x', box_x)
        .attr('y', mouse_y - 50);

      info_text_g
        .attr('text-anchor', 'end')
        .attr('transform',
            'translate (' + (box_x + 5) + ',' + (mouse_y - 35) + ')');

      info_line
        .attr('x1', line_x)
        .attr('x2', line_x)
        .attr('y1', 0)
        .attr('y2', height);
    }

    // evaluate options set by gen_params
    if (gen_params.x_field) {
      self.x_field = gen_params.x_field;
    }

    if (gen_params.y_fields && gen_params.y_fields[0]  &&
      gen_params.z_fields && gen_params.z_fields[0]) {
      self.y_field = gen_params.y_fields[0];
      self.y2_field = gen_params.z_fields[0];
    }
    else if (gen_params.y_fields && gen_params.y_fields[0]) {
      self.y_field = gen_params.y_fields[0];
      self.y2_field = 'count';
    }
    else {
      self.y_field = 'count';
      self.y2_field = 'c_count';
    }

    if (gen_params.extra.show_stat_type) {
      this.show_stat_type = !!JSON.parse(gen_params.extra.show_stat_type);
    }

    data = this.generateData(original_data, controller, gen_params);
    if (data === null) {
      return;
    }

    var records = data.records;
    display.setTitle(this.title_generator(data));

    x_data = records.map(function(d) { return d[self.x_field]; });
    y_data = records.map(function(d) { return d[self.y_field]; });
    y2_data = records.map(function(d) { return d[self.y2_field]; });
    x_min = d3.min(x_data.filter(is_defined));
    x_max = d3.max(x_data.filter(is_defined));
    y_min = d3.min(y_data.filter(is_defined));
    y_max = d3.max(y_data.filter(is_defined));
    y2_min = d3.min(y2_data.filter(is_defined));
    y2_max = d3.max(y2_data.filter(is_defined));

    // Setup display parameters
    height = display.svg().attr('height') - self.margin.top -
      self.margin.bottom;
    width = display.svg().attr('width') - self.margin.left -
      self.margin.right;

    if (!update) {
      display.svg().text('');
      self.svg = display.svg().append('g');

      self.svg.attr('transform',
        'translate(' + self.margin.left + ',' + self.margin.top + ')');

      self.x_axis = d3.svg.axis()
        .scale(self.x_scale)
        .orient('bottom')
        .ticks(6);

      self.y_axis = d3.svg.axis()
        .scale(self.y_scale)
        .orient('left');

      self.y2_axis = d3.svg.axis()
        .scale(self.y2_scale)
        .orient('right');
    }

    self.x_scale.range([0, width]);
    self.y_scale.range([height, 0]);
    self.y2_scale.range([height, 0]);

    if (records.length > 1) {
      self.x_scale.domain([x_min, x_max]);
    }
    else {
      self.x_scale.domain([x_min - 1, x_min + 1]);
    }

    self.y_scale.domain([0, y_max]).nice(10);
    self.y2_scale.domain([0, y2_max]).nice(10);

    if (!update) {
      display.svg().text('');
      self.svg = display.svg().append('g');

      // Setup mouse event listeners
      display.svg().on('mousemove', mouse_moved);
      display.svg().on('mouseleave', mouse_exited);

      // Setup chart
      self.svg.attr('transform',
        'translate(' + self.margin.left + ',' + self.margin.top + ')');

      self.legend_elem = self.svg.append('g')
        .attr('id', 'legend')
        .attr('transform', 'translate(' + (20 - self.margin.left) + ', -50)');

      self.x_axis_elem = self.svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(self.x_axis);

      self.y_axis_elem = self.svg.append('g')
        .attr('class', 'y axis')
        .call(self.y_axis);

      self.y2_axis_elem = self.svg.append('g')
        .attr('class', 'y axis')
        .style('font-style', 'oblique')
        .attr('transform', 'translate(' + width + ', 0)')
        .call(self.y2_axis);

      self.svg.append('path')
        .attr('id', 'line_y')
        .datum(records)
        .style('fill', 'transparent')
        .style('stroke', '1px')
        .style('stroke', 'green')
        .attr('d', line_1);

      self.svg.append('path')
        .attr('id', 'line_y2')
        .datum(records)
        .style('fill', 'transparent')
        .style('stroke', '1px')
        .style('stroke-dasharray', '3,2')
        .style('stroke', d3.rgb('green').brighter())
        .attr('d', line_2);

      if (records.length === 1) {
        self.svg.append('circle')
          .attr('id', 'circle_y')
          .style('fill', 'transparent')
          .style('stroke', '1px')
          .style('stroke', 'green')
          .attr('r', '4px')
          .attr('cx', width / 2)
          .attr('cy', self.y_scale(records [0][self.y_field]));

        self.svg.append('circle')
          .attr('id', 'circle_y2')
          .style('fill', 'transparent')
          .style('stroke', '1px')
          .style('stroke-dasharray', '3,2')
          .style('stroke', d3.rgb('green').brighter())
          .attr('r', '4px')
          .attr('cx', width / 2)
          .attr('cy', self.y2_scale(records[0][self.y2_field]));
      }

      // Create tooltip elements
      info_line = self.svg.append('line')
        .style('stroke', 'grey')
        .style('display', 'none')
        .classed('remove_on_static', true);

      info_box = self.svg.append('rect')
        .style('fill', 'white')
        .style('opacity', '0.75')
        .style('display', 'none')
        .classed('remove_on_static', true);

      info_text_g = self.svg.append('g')
        .style('display', 'none')
        .classed('remove_on_static', true);

      info_text_lines = [];
      info_text_lines .push({
        elem: info_text_g.append('text')
          .attr('transform', 'translate(0,0)')
          .style('font-weight', 'bold')
          .text('X'),
        field: self.x_field,
      });

      info_text_lines.push({
        elem: info_text_g.append('text')
          .attr('transform', 'translate(0,15)')
          .style('font-weight', 'normal')
          .text('Y1'),
        field: self.y_field,
      });

      info_text_lines.push({
        elem: info_text_g.append('text')
          .attr('transform', 'translate(0,30)')
          .style('font-weight', 'normal')
          .text('Y2'),
        field: self.y2_field
      });

      info_text_g.append('line')
        .attr('x1', '0')
        .attr('x2', '15')
        .attr('y1', '10')
        .attr('y2', '10')
        .style('stroke', 'green');

      info_text_g.append('line')
        .attr('x1', '0')
        .attr('x2', '15')
        .attr('y1', '25')
        .attr('y2', '25')
        .style('stroke-dasharray', '3,2')
        .style('stroke', d3.rgb('green').brighter());
    }

    /* Create legend items */
    /* TODO: automatic layout of legend elements*/
    self.legend_elem.text('');
    var legend_part = self.legend_elem.append('g');
    var legend_part_x = 0;
    var legend_part_y = 0;
    var last_part_rect;
    var current_part_rect;

    legend_part.append('path')
      .attr('d', 'M 0 10 L 20 10')
      .style('fill', 'transparent')
      .style('stroke', '1px')
      .style('stroke', 'green');

    legend_part.append('text')
      .style('font-size', '8pt')
      .style('font-weight', 'bold')
      .attr('x', 25)
      .attr('y', 15)
      .text(gsa.column_label(
        column_info.columns[self.y_field], true, false, self.show_stat_type));

    last_part_rect = legend_part.node().getBoundingClientRect();
    legend_part = self.legend_elem.append('g');

    legend_part.append('path')
      .attr('d', 'M 0 10 L 20 10')
      .style('fill', 'transparent')
      .style('stroke', '1px')
      .style('stroke-dasharray', '3,2')
      .style('stroke', d3.rgb('green').brighter());

    legend_part.append('text')
      .style('font-size', '8pt')
      .style('font-weight', 'bold')
      .style('font-style', 'oblique')
      .attr('x', 25)
      .attr('y', 15)
      .text(gsa.column_label(
        column_info.columns[self.y2_field], true, false, self.show_stat_type));

    current_part_rect = legend_part.node().getBoundingClientRect();
    if (legend_part_x + last_part_rect.width + current_part_rect.width + 10 <=
        width - 40 + self.margin.left + self.margin.right) {
      legend_part_x = legend_part_x + last_part_rect.width + 10;
    }
    else {
      legend_part_x = 0;
      legend_part_y = legend_part_y + last_part_rect.height + 2;
    }
    legend_part.attr('transform', 'translate(' + legend_part_x +
          ', ' + legend_part_y + ')');

    self.x_axis_elem
      .call(self.x_axis)
      .attr('transform', 'translate(0,' + height + ')');

    self.y_axis_elem.call(self.y_axis);

    self.y2_axis_elem
      .call(self.y2_axis)
      .attr('transform', 'translate(' + width + ', 0)');

    self.svg.select('#line_y')
      .datum(records)
      .attr('d', line_1);

    self.svg.select('#line_y2')
      .datum(records)
      .attr('d', line_2);

    var enter = self.svg.selectAll('.marker')
      .data(records)
      .enter();

    if (self.y_field !== 'count' && self.y_field !== 'c_count') {
      enter.insert('circle')
        .attr('class', 'marker y')
        .attr('r', 1.5)
        .style('fill', d3.rgb('green'))
        .style('stroke', d3.rgb('green'));
    }

    if (self.y2_field !== 'count' && self.y2_field !== 'c_count') {
      enter.insert('circle')
        .attr('class', 'marker y2')
        .attr('r', 1.5)
        .style('fill', 'none')
        .style('stroke', d3.rgb('green').brighter());
    }

    self.svg.selectAll('.marker.y')
      .data(records)
      .attr('cx', function(d) { return self.x_scale(d[self.x_field]); })
      .attr('cy', function(d) { return self.y_scale(d[self.y_field]); });

    self.svg.selectAll('.marker.y2')
      .data(records)
      .attr('cx', function(d) { return self.x_scale(d[self.x_field]); })
      .attr('cy', function(d) { return self.y_scale(d[self.y2_field]); });

    self.svg.selectAll('.marker.y')
      .data(records)
      .exit()
      .remove();

    self.svg.selectAll('.marker.y2')
      .data(records)
      .exit()
      .remove();

    if (records.length === 1) {
      self.svg.select('#circle_y')
        .attr('cx', width / 2)
        .attr('cy', self.y_scale(records[0][self.y_field]));

      self.svg.select('#circle_y2')
        .attr('cx', width / 2)
        .attr('cy', self.y2_scale(records[0][self.y2_field]));
    }
    else {
      self.svg.select('#circle_y').remove();
      self.svg.select('#circle_y2').remove();
    }

    this.addMenuItems(controller, data);
  };

  LineChartGenerator.prototype.generateData = function(original_data,
      controller, gen_params) {
    // Extract records and column info
    var cmd = controller.data_src().command();
    if (cmd === 'get_aggregate') {
      return this.transformData(original_data, gen_params);
    }
    else {
      console.error('Unsupported command:' + cmd);
      return null;
    }
  };

  LineChartGenerator.prototype.generateCsvData = function(controller, data) {
    var cols = data.column_info.columns;
    return gsa.csv_from_records(data.records, data.column_info,
        [this.x_field, this.y_field, this.y2_field],
        [gsa.column_label(cols[this.x_field], true, false, this.show_stat_type),
        gsa.column_label(cols[this.y_field], true, false, this.show_stat_type),
        gsa.column_label(cols[this.y2_field], true, false,
          this.show_stat_type)],
        controller.display().header().text());
  };

  LineChartGenerator.prototype.generateHtmlTableData = function(controller,
      data) {
    var cols = data.column_info.columns;
    return gsa.html_table_from_records(data.records, data.column_info,
        [this.x_field, this.y_field, this.y2_field],
        [gsa.column_label(cols[this.x_field], true, false, this.show_stat_type),
        gsa.column_label(cols[this.y_field], true, false, this.show_stat_type),
        gsa.column_label(cols[this.y2_field], true, false,
          this.show_stat_type)],
        controller.display().header().text(),
        controller.data_src().param('filter'));
  };

  LineChartGenerator.prototype.time_line = function(old_data, params) {
    var t_field = 'value';
    var fillers = {};
    var self = this;

    if (params) {
      if (params.t_field !== null && params.t_field !== undefined) {
        t_field = params.t_field;
      }
      if (params.fillers !== null && params.fillers !== undefined) {
        fillers = params.fillers;
      }
    }

    var new_data = {
      original_xml: old_data.original_xml,
      records: [],
      column_info: {},
      filter_info: old_data.filter_info,
    };

    var column_info = new_data.column_info;
    column_info.group_columns = old_data.column_info.group_columns;
    column_info.data_columns = old_data.column_info.data_columns;
    column_info.columns = {};

    function generate_label(column, capitalize_label, include_type,
        include_stat) {
      var suffix = '';

      if (self.x_step === d3.time.day.utc) {
        suffix = ' / day';
      }
      else if (self.x_step === d3.time.week.utc) {
        suffix = ' / week';
      }
      else if (self.x_step === d3.time.month.utc) {
        suffix = ' / month';
      }
      else if (self.x_step === d3.time.year.utc) {
        suffix = ' / year';
      }

      return gsa.default_column_label(column, capitalize_label,
            include_type, include_stat) + suffix;
    }

    for (var column_name in old_data.column_info.columns) {
      var info;
      var column = old_data.column_info.columns[column_name];
      if (column_name === t_field) {
        column_info.columns[column_name] = {};
        for (info in column) {
          if (info === 'data_type') {
            column_info.columns[column_name][info] = 'js_date';
          }
          else {
            column_info.columns[column_name][info] = column[info];
          }
        }
      }
      else if (column.stat === 'count') {
        column_info.columns[column_name] = {};
        for (info in column) {
          column_info.columns[column_name][info] = column[info];
        }

        column_info.columns[column_name].label_generator = generate_label;
      }
      else {
        column_info.columns [column_name] =
          old_data.column_info.columns[column_name];
      }
    }

    if (old_data.records.length === 0) {
      return new_data;
    }

    var t_index = 0;

    while (isNaN(old_data.records[t_index][t_field])) {
      t_index++;
    }
    var t_min = new Date(old_data.records[t_index][t_field] * 1000);

    t_index = old_data.records.length - 1;
    while (isNaN(old_data.records[t_index][t_field])) {
      t_index--;
    }
    var t_max = new Date(old_data.records[t_index][t_field] * 1000);

    var interval_days = (t_max.getTime() - t_min.getTime()) / 86400000;
    var times;
    t_index = 0;
    var data_index = 0;
    var prev_values = {};

    if (interval_days <= 100) {
      self.x_step = d3.time.day.utc;
      times = d3.time.day.range.utc(d3.time.day.utc.floor(t_min),
          t_max);
    }
    else if (interval_days <= 750) {
      self.x_step = d3.time.week.utc;
      times = d3.time.week.range.utc(d3.time.week.utc.floor(t_min),
          t_max);
    }
    else if (interval_days <= 3650) {
      self.x_step = d3.time.month.utc;
      times = d3.time.month.range.utc(d3.time.month.utc.floor(t_min),
          t_max);
    }
    else {
      self.x_step = d3.time.year.utc;
      times = d3.time.year.range.utc(d3.time.year.utc.floor(t_min),
          t_max);
    }

    for (t_index in times) {
      var new_record = {};
      var t = times[t_index];
      var values = {};
      new_record[t_field] = t;
      var has_values = false;
      var field;

      while (data_index < old_data.records.length &&
          (t_index >= times.length - 1 ||
           isNaN(old_data.records[data_index][t_field]) ||
           old_data.records[data_index][t_field] * 1000 <
           times[Number(t_index) + 1].getTime())) {
        if (isNaN(old_data.records[data_index][t_field])) {
          data_index++;
          continue;
        }

        for (field in old_data.records[data_index]) {
          if (field !== t_field) {
            if (values[field] === undefined) {
              values[field] = old_data.records[data_index][field];
            }
            else if (column_info.columns[field].stat === 'sum' ||
                column_info.columns[field].stat === 'count') {
              values[field] += Number(old_data.records[data_index][field]);
            }
            else if (column_info.columns[field].stat === 'min') {
              values[field] = Math.min(values[field],
                  Number(old_data.records[data_index][field]));
            }
            else if (column_info.columns[field].stat === 'max' ||
                column_info.columns[field].stat === 'c_count') {
              values[field] = Math.max(values[field],
                  Number(old_data.records[data_index][field]));
            }
          }
        }

        data_index ++;
      }

      for (field in old_data.column_info.columns) {
        if (field !== t_field) {
          if (values[field] !== null && values[field] !== undefined) {
            prev_values[field] = values[field];
            new_record[field] = values[field];
            has_values = true;
          }
          else if (fillers[field] === '!previous') {
            new_record[field] = prev_values[field] ? prev_values[field] : 0;
          }
          else if (fillers [field] !== null) {
            new_record[field] = fillers[field];
          }
          else if (old_data.column_info.columns[field].stat === 'c_count') {
            new_record[field] = prev_values[field] ? prev_values[field] : 0;
          }
          else if (old_data.column_info.columns[field].stat === 'count') {
            new_record[field] = 0;
          }
          else {
            new_record[field] = null;
          }
        }
      }
      // FIXME: make filling an explicit option
      if (has_values || self.y_field === 'count' ||
          self.y_field === 'c_count' || self.y2_field === 'count' ||
          self.y2_field === 'c_count') {
        new_data.records.push(new_record);
      }
    }

    return new_data;
  };

})(window, window, window.d3, window.console, window.gsa);

// vim: set ts=2 sw=2 tw=80:
