import React, { Component } from "react";
import Modal from "./components/Modal";
import axios from "axios";
import { withAlert } from 'react-alert';
import { PlaidLink } from 'react-plaid-link';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      plaidLinkToken: {},
      viewState: 'pending',
      categoryList: [],
      expenseList: [],
      modal: false,
      model_name: "",
      action_name: "",
      activeItem: {
        name: "",
      },
    };
  }

  handleOnSuccess(token, metadata) {
    axios
      .post("/tracker/exchange_public_token", { 'public_token': token, 'metadata': metadata })
  }
  handleOnExit() {
  }

  componentDidMount() {
    this.refreshList();
    this.retrievePlaidLinkToken();
  }

  retrievePlaidLinkToken = () => {
    axios
      .post("/tracker/create_link_token", {})
      .then((res) => this.setState({ plaidLinkToken: res.data }))
  };

  refreshList = () => {
    axios
      .get("/tracker/categories/")
      .then((res) => this.setState({ categoryList: res.data }))
    axios
      .get("/tracker/expenses/")
      .then((res) => this.setState({ expenseList: res.data.results }))
  };

  toggle = () => {
    this.setState({ modal: !this.state.modal });
  };

  handleSubmit = (item) => {
    this.toggle();
    var url = "";
    if (this.state.model_name === 'Expense Category') {
      url = `/tracker/categories/`
    } else {
      url = `/tracker/expenses/`
    }
    if (this.state.action_name === 'Edit') {
      url = url + `${item.id}/`
      axios
        .put(url, item)
        .then((res) => this.props.alert.success('Record Updated'))
        .catch((err) => this.props.alert.error(JSON.stringify(err.response.data)))
        .then((res) => this.refreshList());
      return;
    }
    axios
      .post(url, item)
      .then((res) => this.props.alert.success('Record Created'))
      .catch((err) => this.props.alert.error(JSON.stringify(err.response.data)))
      .then((res) => this.refreshList());
  };

  handleDelete = (item) => {
    var url = "";
    if (item.object_type === 'expensecategory') {
      url = `/tracker/categories/${item.id}/`
    } else {
      url = `/tracker/expenses/${item.id}/`
    }
    axios
      .delete(url)
      .then((res) => this.props.alert.info('Record Deleted'))
      .catch((err) => this.props.alert.error(err.response.data.error))
      .then((res) => this.refreshList());
  };

  createCategory = () => {
    const item = { name: "" };

    this.setState({ model_name: 'Expense Category', action_name: 'Create', activeItem: item, modal: !this.state.modal });
  };

  syncExpense = () => {
    axios
      .get("/tracker/get_plaid_transaction")
      .then((res) => this.props.alert.info(res.data))
      .catch((err) => this.props.alert.error(JSON.stringify(err.response.data)))
      .then((res) => this.refreshList());
  };

  createExpense = () => {
    const item = {
      name: "",
      transaction_id: "",
      category_id: this.state.categoryList[0].id,
      date: "",
      amount: 0.00,
      state: "pending"
    };
    this.setState({ model_name: 'Expense', action_name: 'Create', activeItem: item, modal: !this.state.modal });
  };

  editExpenseCategory = (item) => {
    this.setState({ model_name: 'Expense Category', action_name: 'Edit', activeItem: item, modal: !this.state.modal });
  };

  editExpense = (item) => {
    this.setState({ model_name: 'Expense', action_name: 'Edit', activeItem: item, modal: !this.state.modal });
  };

  displayState = (status) => {
    const state = status;
    return this.setState({ viewState: state });
  };

  renderTabList = () => {
    return (
      <div className="nav nav-tabs">
        <span
          onClick={() => this.displayState('done')}
          className={(this.state.viewState === 'done') ? "nav-link active" : "nav-link"}
        >
          Done
        </span>
        <span
          onClick={() => this.displayState('pending')}
          className={(this.state.viewState === 'pending') ? "nav-link active" : "nav-link"}
        >
          Pending
        </span>
        <span
          onClick={() => this.displayState('ignore')}
          className={(this.state.viewState === 'ignore') ? "nav-link active" : "nav-link"}
        >
          Ignore
        </span>
      </div>
    );
  };

  renderExpenseCategories = () => {
    const categoryList = this.state.categoryList;

    return categoryList.map((item) => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span
          className={`todo-title mr-2 ${this.state.viewState ? "completed-todo" : ""
            }`}
          title={item.name}
        >
          {item.name}
        </span>
        <span>
          <button
            className="btn btn-secondary mr-2"
            onClick={() => this.editExpenseCategory(item)}
          >
            Edit
          </button>
          <button
            className="btn btn-danger"
            onClick={() => this.handleDelete(item)}
          >
            Delete
          </button>
        </span>
      </li>
    ));
  };

  renderExpenses = () => {
    const { viewState } = this.state;
    const expenseList = this.state.expenseList.filter(
      (item) => item.state === viewState
    );

    return expenseList.map((item) => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span
          className={`todo-title mr-2 ${this.state.viewState ? "completed-todo" : ""
            }`}
          title={item.name}
        >
          {item.name}
        </span>
        <span>
          <button
            className="btn btn-secondary mr-2"
            onClick={() => this.editExpense(item)}
          >
            Edit
          </button>
          <button
            className="btn btn-danger"
            onClick={() => this.handleDelete(item)}
          >
            Delete
          </button>
        </span>
      </li>
    ));
  };


  render() {
    return (
      <main className="container">
        <h1 className="text-black text-uppercase text-center my-4">Expenses</h1>
        <div className="row">
          <PlaidLink
            clientName="Nomad"
            env="sandbox"
            product={["auth", "transactions"]}
            token={this.state.plaidLinkToken.link_token}
            onExit={this.handleOnExit}
            onSuccess={this.handleOnSuccess}
          >
            Connect a Bank
          </PlaidLink>
        </div>
        <div className="row">
          <div className="mx-auto p-0">
            <div className="card p-3">
              <div className="mb-4">
                <button
                  className="btn btn-primary"
                  onClick={this.createCategory}
                >
                  Add Category
                </button>
              </div>
              <ul className="list-group list-group-flush border-top-0">
                {this.renderExpenseCategories()}
              </ul>
            </div>
          </div>

          <div className="mx-auto p-0">
            <div className="card p-3">
              <div className="mb-4">
                <button
                  className="btn btn-primary"
                  onClick={this.createExpense}
                >
                  Add Expense
                </button>
                <button
                  className="btn btn-primary float-right"
                  onClick={this.syncExpense}
                >
                  Sync Expenses
                </button>
              </div>
              {this.renderTabList()}
              <ul className="list-group list-group-flush border-top-0">
                {this.renderExpenses()}
              </ul>
            </div>
          </div>

        </div>
        {this.state.modal ? (
          <Modal
            activeItem={this.state.activeItem}
            model_name={this.state.model_name}
            action_name={this.state.action_name}
            categoryList={this.state.categoryList}
            toggle={this.toggle}
            onSave={this.handleSubmit}
          />
        ) : null}
      </main>
    );
  }
}

export default withAlert()(App);