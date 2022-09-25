import React, { Component } from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Input,
  Label,
} from "reactstrap";
import Select from 'react-select'
import axios from "axios";
import AsyncSelect from 'react-select/async';

export default class CustomModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeItem: this.props.activeItem,
      model_name: this.props.model_name,
      action_name: this.props.action_name,
      categoryList: this.props.categoryList,
      stayList: this.props.stayList,
      defaultCity: this.props.defaultCity,
      defaultStay: this.props.defaultStay,
    };
  }

  handleChange = (e) => {
    let { name, value } = e.target;

    if (e.target.type === "checkbox") {
      value = e.target.checked;
    }

    const activeItem = { ...this.state.activeItem, [name]: value };

    this.setState({ activeItem });
  };

  handleSelect = (e) => {
    let { id } = e;

    const activeItem = { ...this.state.activeItem, 'category_id': id };

    this.setState({ activeItem });
  };

  handleCitySelect = (e) => {
    let { id } = e;

    const activeItem = { ...this.state.activeItem, 'city_id': id };

    this.setState({ activeItem });
  };

  handleStaySelect = (e) => {
    var activeItem = { ...this.state.activeItem }
    if (e) {
      let { id } = e;
      activeItem = { ...this.state.activeItem, 'stay_id': id };
    } else {
      activeItem = { ...this.state.activeItem, 'stay_id': null };
    }
    this.setState({ activeItem });
  };

  fetchCities = (inputValue, callback) => {
    axios.get("/tracker/cities/", { params: { search: inputValue } }).then((res) => callback(res.data.results))
  }

  render() {
    const { toggle, onSave } = this.props;
    var modal_title = this.state.model_name;
    var action_title = this.state.action_name;

    const isSearchable = true;
    const isClearable = true;
    const isLoading = false;

    const categoryList = this.state.categoryList;
    const stayList = this.state.stayList;
    var defaultCategory = categoryList.filter((item) => item.id === this.state.activeItem.category_id);
    var defaultStay = stayList.filter((item) => item.id === this.state.activeItem.stay_id);


    var form = <Form />

    if (modal_title === 'Expense Category') {
      form = (
        <Form>
          <FormGroup>
            <Label for="category-name">Name</Label>
            <Input
              type="text"
              id="category-name"
              name="name"
              value={this.state.activeItem.name}
              onChange={this.handleChange}
              placeholder="Enter expense category name..."
            />
          </FormGroup>
        </Form>
      );
    } else if (modal_title === 'Expense') {
      form = (
        <Form>
          <FormGroup>
            <Label for="expense-date">Date</Label>
            <Input
              type="date"
              id="expense-date"
              name="date"
              value={this.state.activeItem.date}
              onChange={this.handleChange}
            />
          </FormGroup>

          <FormGroup>
            <Label for="expense-transactionId">Transaction ID</Label>
            <Input
              type="text"
              id="expense-transactionId"
              name="transaction_id"
              value={this.state.activeItem.transaction_id}
              onChange={this.handleChange}
              placeholder="Enter expense transaction id..."
            />
          </FormGroup>

          <FormGroup>
            <Label for="expense-name">Label</Label>
            <Input
              type="text"
              id="expense-name"
              name="name"
              value={this.state.activeItem.name}
              onChange={this.handleChange}
              placeholder="Enter expense name..."
            />
          </FormGroup>

          <FormGroup>
            <Label for="expense-category">Category</Label>
            <Select
              id="expense-category"
              name="category_id"
              className="basic-single"
              classNamePrefix="select"
              defaultValue={defaultCategory}
              onChange={this.handleSelect}
              isLoading={isLoading}
              isClearable={isClearable}
              isSearchable={isSearchable}
              options={categoryList}
              getOptionLabel={x => x.name}
              getOptionValue={x => x.id}
            />
          </FormGroup>

          <FormGroup>
            <Label for="expense-amount">Amount</Label>
            <Input
              type="decimal"
              id="expense-amount"
              name="amount"
              value={this.state.activeItem.amount}
              onChange={this.handleChange}
              placeholder="Enter expense amount..."
            />
          </FormGroup>

          <FormGroup>
            <Label for="expense-status">Status</Label>
            <select class="form-control"
              id="expense-status"
              name="state"
              value={this.state.activeItem.state}
              onChange={this.handleChange}>
              <option value='pending'>Pending</option>
              <option value='done'>Done</option>
              <option value='ignore'>Ignore</option>
            </select>
          </FormGroup>

          <FormGroup>
            <Label for="expense-classification">Classification</Label>
            <select class="form-control"
              id="expense-classification"
              name="expense_classification"
              value={this.state.activeItem.expense_classification}
              onChange={this.handleChange}>
              <option value='none'>Not Applied</option>
              <option value='transportation'>Transportation</option>
              <option value='lodging'>Lodging</option>
              <option value='business'>Business</option>
              <option value='misc'>Misc</option>
            </select>
          </FormGroup>

          <FormGroup>
            <Label for="expense-stay">Spread Across Stay</Label>
            <Select
              id="expense-stay"
              name="stay_id"
              className="basic-single"
              classNamePrefix="select"
              defaultValue={defaultStay}
              onChange={this.handleStaySelect}
              isLoading={isLoading}
              isClearable={true}
              isSearchable={isSearchable}
              options={stayList}
              getOptionLabel={x => x.display_name}
              getOptionValue={x => x.id}
            />
          </FormGroup>

        </Form>
      );
    } else {
      form = (
        <Form>
          <FormGroup>
            <Label for="stay-city">City</Label>
            <AsyncSelect
              id="stay-city"
              name="city_id"
              className="basic-single"
              classNamePrefix="select"
              placeholder="Select a city..."
              defaultOptions={false}
              defaultValue={this.state.defaultCity}
              onChange={this.handleCitySelect}
              isSearchable={isSearchable}
              loadOptions={this.fetchCities}
              getOptionLabel={x => x.display_name}
              getOptionValue={x => x.id}
            />
          </FormGroup>

          <FormGroup>
            <Label for="stay-date">Date Start</Label>
            <Input
              type="date"
              id="stay-date-start"
              name="date_start"
              value={this.state.activeItem.date_start}
              onChange={this.handleChange}
            />
          </FormGroup>

          <FormGroup>
            <Label for="stay-date-end">Date End</Label>
            <Input
              type="date"
              id="stay-date-end"
              name="date_end"
              value={this.state.activeItem.date_end}
              onChange={this.handleChange}
            />
          </FormGroup>
        </Form>
      );
    };


    return (
      <Modal isOpen={true} toggle={toggle}>
        <ModalHeader toggle={toggle}>{action_title} {modal_title}</ModalHeader>
        <ModalBody>
          {form}
        </ModalBody>
        <ModalFooter>
          <Button
            color="success"
            onClick={() => onSave(this.state.activeItem)}
          >
            Save
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}