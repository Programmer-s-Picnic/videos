
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Market Page</title>
    </head>
    <body>
        <h1>Market</h1>
        <form method="post" action="paymentbank.jsp">
            Items<select name="items">
                <option value="computer">Computer</option>
                <option value="car">Car</option>
                <option value="shirt">Shirt</option>
            </select>
            <br>
            <input type="number" value="1" min="1" name="qty"><br>
            <input type="submit" value="Go">


        </form>
    </body>
</html>
