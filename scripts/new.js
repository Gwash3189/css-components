#!/usr/bin/env node

/**
 * Copyright Zendesk, Inc.
 *
 * Use of this source code is governed under the Apache License, Version 2.0
 * found at http://www.apache.org/licenses/LICENSE-2.0.
 */

/* eslint-disable no-console */

const Handlebars = require('handlebars');
const chalk = require('chalk');
const execSync = require('child_process').execSync;
const fs = require('fs');
const walk = require('klaw-sync');
const ncp = require('ncp').ncp;
const path = require('path');
const rimraf = require('rimraf');

/* eslint-disable-next-line max-len */
Handlebars.registerHelper('capitalize', ([first, ...rest]) => `${first.toUpperCase()}${rest.join('')}`);

const demo = path.join(process.cwd(), 'demo');
const packages = path.join(process.cwd(), 'packages');

/**
 * Link demo CSS to the package dist for the given component.
 *
 * @param {String} component The name of the component to link.
 */
function linkCss(component) {
  const destination = path.join(demo, component);

  process.chdir(destination);

  const dist = path.join(packages, component, 'dist');
  const source = path.relative(destination, dist);

  fs.readdirSync(source).forEach(file => {
    fs.symlinkSync(path.join(source, file), file);
  });

  console.log(chalk.green('success'), 'Linked demo CSS');
}

/**
 * Update the HTML page demo for the given component.
 *
 * @param {String} component The name of the component to update.
 */
function updateDemo(component) {
  const source = path.join(packages, component, 'demo');
  const destination = path.join(demo, component);

  ncp(source, destination, error => {
    if (error) {
      console.log(chalk.red('error'), error);
    } else {
      rimraf(source, () => {
        console.log(chalk.green('success'), 'Updated component demo');
        execSync(`yarn build --scope @zendeskgarden/css-${component}`);
        linkCss(component);
        execSync(`yarn start --open=${component}`);
      });
    }
  });
}

/**
 * Add a new component package with the given name.
 *
 * @param {String} name The name of the component to add.
 */
function addComponent(name) {
  const source = path.join(packages, '.template');
  const destination = path.join(packages, name);

  if (fs.existsSync(destination)) {
    console.log(chalk.red('error'), 'Component package exists');
  } else {
    ncp(source, destination, error => {
      if (error) {
        console.log(chalk.red('error'), error);
      } else {
        const items = walk(destination, { nodir: true });

        items.forEach(item => {
          const string = fs.readFileSync(item.path, 'utf8');
          const template = Handlebars.compile(string);
          const data = template({ component: name });

          fs.writeFileSync(item.path, data, 'utf8');
        });

        console.log(chalk.green('success'), 'Added new component');
        execSync('yarn postinstall');
        updateDemo(name);
      }
    });
  }
}

if (process.argv.length >= 3) {
  addComponent(process.argv[2]);
} else {
  console.log(chalk.red('error'), 'Missing component name');
}
