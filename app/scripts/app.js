'use strict';

var kokpitApp = angular.module('kokpitApp', [])

$(function() {
  $(".gridster ul").gridster({
      widget_margins: [18, 18],
      widget_base_dimensions: [312, 312]
  });
});