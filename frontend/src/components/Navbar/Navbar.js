import React, { Component } from 'react';
import { MenuItems } from './MenuItems';
import './Navbar.css'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlassDollar, faBars, faTimes } from '@fortawesome/free-solid-svg-icons'

class Navbar extends Component {
  state = { clicked: false }

  handleClick = () => {
    this.setState({ clicked: !this.state.clicked })
  }

  render() {
    return (
      <nav className="NavbarItems">
        <h1 className="navbar-logo"><FontAwesomeIcon className="navbar-logo-icon" icon={faMagnifyingGlassDollar} /> nomad</h1>
        <div className="menu-icon" onClick={this.handleClick}>
          {this.state.clicked ? null : <FontAwesomeIcon icon={faBars} />}
        </div>
        <ul className={this.state.clicked ? 'nav-menu active' : 'nav-menu'}>
          {MenuItems.map((item, index) => {
            return (
              <li key={index}><a className={item.cName} href={item.url}>{item.title}</a></li>
            )
          })}
          {this.state.clicked ? <li className="exitIcon" onClick={this.handleClick}><FontAwesomeIcon icon={faTimes} /> </li> : null}
        </ul>
      </nav >
    )
  }
}

export default Navbar